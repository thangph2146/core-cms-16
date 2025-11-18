"use client"

import { useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { useQueryClient } from "@tanstack/react-query"
import { useSocket } from "@/hooks/use-socket"
import { logger } from "@/lib/config"
import type { ContactRequestRow } from "../types"
import type { DataTableResult } from "@/components/tables"
import { queryKeys, type AdminContactRequestsListParams, invalidateQueries } from "@/lib/query-keys"
import {
  matchesSearch,
  matchesFilters,
  shouldIncludeInStatus,
  insertRowIntoPage,
  removeRowFromPage,
  convertSocketPayloadToRow,
} from "../utils/socket-helpers"

interface ContactRequestUpsertPayload {
  contactRequest: ContactRequestRow
  previousStatus: "active" | "deleted" | null
  newStatus: "active" | "deleted"
}

interface ContactRequestRemovePayload {
  id: string
  previousStatus: "active" | "deleted"
}

function updateContactRequestQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  updater: (args: { key: unknown[]; params: AdminContactRequestsListParams; data: DataTableResult<ContactRequestRow> }) => DataTableResult<ContactRequestRow> | null,
): boolean {
  let updated = false
  const queries = queryClient.getQueriesData<DataTableResult<ContactRequestRow>>({
    queryKey: queryKeys.adminContactRequests.all() as unknown[],
  })
  
  logger.debug("Found contact request queries to update", { count: queries.length })
  
  for (const [key, data] of queries) {
    if (!Array.isArray(key) || key.length < 2) continue
    const params = key[1] as AdminContactRequestsListParams | undefined
    if (!params || !data) {
      logger.debug("Skipping query", { hasParams: !!params, hasData: !!data })
      continue
    }
    const next = updater({ key, params, data })
    if (next) {
      logger.debug("Setting query data", {
        key: key.slice(0, 2),
        oldRowsCount: data.rows.length,
        newRowsCount: next.rows.length,
        oldTotal: data.total,
        newTotal: next.total,
      })
      queryClient.setQueryData(key, next)
      updated = true
    } else {
      logger.debug("Updater returned null, skipping update")
    }
  }
  
  return updated
}

export function useContactRequestsSocketBridge() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const primaryRole = useMemo(() => session?.roles?.[0]?.name ?? null, [session?.roles])
  const [cacheVersion, setCacheVersion] = useState(0)

  const { socket, on } = useSocket({
    userId: session?.user?.id,
    role: primaryRole,
  })

  const [isConnected, setIsConnected] = useState<boolean>(() => Boolean(socket?.connected))

  useEffect(() => {
    if (!session?.user?.id) return

    // Handle contact-request:new event
    const detachNew = on<[{ id: string; name: string; email: string; phone?: string | null; subject: string; status: string; priority: string; createdAt: string; assignedToId?: string | null; assignedToName?: string | null }]>("contact-request:new", (payload) => {
      logger.debug("Received contact-request:new", {
        contactRequestId: payload.id,
        subject: payload.subject,
      })

      const row = convertSocketPayloadToRow(payload, payload.assignedToName ?? null)
      const rowStatus: "active" | "deleted" = "active"

      const updated = updateContactRequestQueries(queryClient, ({ params, data }) => {
        const matches = matchesFilters(params.filters, row) && matchesSearch(params.search, row)
        const includesByStatus = shouldIncludeInStatus(params.status, rowStatus)
        const existingIndex = data.rows.findIndex((r) => r.id === row.id)
        const shouldInclude = matches && includesByStatus

        logger.debug("Processing contact request update", {
          contactRequestId: row.id,
          viewStatus: params.status,
          rowStatus,
          includesByStatus,
          existingIndex,
          shouldInclude,
        })

        if (existingIndex === -1 && !shouldInclude) {
          return null
        }

        const next: DataTableResult<ContactRequestRow> = { ...data }
        let total = next.total
        let rows = next.rows

        if (shouldInclude) {
          if (existingIndex >= 0) {
            const updated = [...rows]
            updated[existingIndex] = row
            rows = updated
          } else if (params.page === 1) {
            rows = insertRowIntoPage(rows, row, next.limit)
            total = total + 1
          }
        } else if (existingIndex >= 0) {
          const result = removeRowFromPage(rows, row.id)
          rows = result.rows
          if (result.removed) {
            total = Math.max(0, total - 1)
          }
        } else {
          return null
        }

        const totalPages = total === 0 ? 0 : Math.ceil(total / next.limit)

        const result = {
          ...next,
          rows,
          total,
          totalPages,
        }

        logger.debug("Cache updated for contact request", {
          contactRequestId: row.id,
          rowsCount: result.rows.length,
          total: result.total,
        })

        return result
      })

      if (updated) {
        setCacheVersion((prev) => prev + 1)
        // Invalidate unread counts để cập nhật contact requests count
        invalidateQueries.unreadCounts(queryClient, session?.user?.id)
      }
    })

    // Handle contact-request:upsert event (for updates)
    const detachUpsert = on<[ContactRequestUpsertPayload]>("contact-request:upsert", (payload) => {
      const { contactRequest, previousStatus, newStatus } = payload as ContactRequestUpsertPayload
      const rowStatus: "active" | "deleted" = contactRequest.deletedAt ? "deleted" : "active"

      logger.debug("Received contact-request:upsert", {
        contactRequestId: contactRequest.id,
        previousStatus,
        newStatus,
        rowStatus,
        deletedAt: contactRequest.deletedAt,
      })

      const updated = updateContactRequestQueries(queryClient, ({ params, data }) => {
        const matches = matchesFilters(params.filters, contactRequest) && matchesSearch(params.search, contactRequest)
        const includesByStatus = shouldIncludeInStatus(params.status, rowStatus)
        const existingIndex = data.rows.findIndex((row) => row.id === contactRequest.id)
        const shouldInclude = matches && includesByStatus

        logger.debug("Processing contact request update", {
          contactRequestId: contactRequest.id,
          viewStatus: params.status,
          rowStatus,
          includesByStatus,
          existingIndex,
          shouldInclude,
        })

        if (existingIndex === -1 && !shouldInclude) {
          return null
        }

        const next: DataTableResult<ContactRequestRow> = { ...data }
        let total = next.total
        let rows = next.rows

        if (shouldInclude) {
          if (existingIndex >= 0) {
            const updated = [...rows]
            updated[existingIndex] = contactRequest
            rows = updated
          } else if (params.page === 1) {
            rows = insertRowIntoPage(rows, contactRequest, next.limit)
            total = total + 1
          } else {
            if (previousStatus && previousStatus !== rowStatus) {
              // Status changed, but on pages > 1 we can't insert accurately
            }
          }
        } else if (existingIndex >= 0) {
          const result = removeRowFromPage(rows, contactRequest.id)
          rows = result.rows
          if (result.removed) {
            total = Math.max(0, total - 1)
          }
        } else {
          return null
        }

        const totalPages = total === 0 ? 0 : Math.ceil(total / next.limit)

        const result = {
          ...next,
          rows,
          total,
          totalPages,
        }

        logger.debug("Cache updated for contact request", {
          contactRequestId: contactRequest.id,
          rowsCount: result.rows.length,
          total: result.total,
          wasRemoved: existingIndex >= 0 && !shouldInclude,
        })

        return result
      })

      if (updated) {
        setCacheVersion((prev) => prev + 1)
        // Invalidate unread counts để cập nhật contact requests count
        invalidateQueries.unreadCounts(queryClient, session?.user?.id)
      }
    })

    // Handle contact-request:assigned event
    const detachAssigned = on<[{ id: string; assignedToId?: string | null; assignedToName?: string | null }]>("contact-request:assigned", (payload) => {
      logger.debug("Received contact-request:assigned", {
        contactRequestId: payload.id,
        assignedToId: payload.assignedToId,
      })

      const updated = updateContactRequestQueries(queryClient, ({ data }) => {
        const existingIndex = data.rows.findIndex((r) => r.id === payload.id)
        if (existingIndex === -1) {
          return null
        }

        const next: DataTableResult<ContactRequestRow> = { ...data }
        const rows = [...next.rows]
        rows[existingIndex] = {
          ...rows[existingIndex],
          assignedToName: payload.assignedToName ?? null,
        }

        return {
          ...next,
          rows,
        }
      })

      if (updated) {
        setCacheVersion((prev) => prev + 1)
        // Invalidate unread counts để cập nhật contact requests count
        invalidateQueries.unreadCounts(queryClient, session?.user?.id)
      }
    })

    // Handle contact-request:remove event
    const detachRemove = on<[ContactRequestRemovePayload]>("contact-request:remove", (payload) => {
      const { id } = payload as ContactRequestRemovePayload
      logger.debug("Received contact-request:remove", { contactRequestId: id })
      
      const updated = updateContactRequestQueries(queryClient, ({ params, data }) => {
        const result = removeRowFromPage(data.rows, id)
        if (!result.removed) {
          logger.debug("Contact request not found in current view", { contactRequestId: id, viewStatus: params.status })
          return null
        }
        
        const total = Math.max(0, data.total - 1)
        const totalPages = total === 0 ? 0 : Math.ceil(total / data.limit)
        
        logger.debug("Removed contact request from cache", {
          contactRequestId: id,
          oldRowsCount: data.rows.length,
          newRowsCount: result.rows.length,
          oldTotal: data.total,
          newTotal: total,
        })
        
        return {
          ...data,
          rows: result.rows,
          total,
          totalPages,
        }
      })
      
      if (updated) {
        setCacheVersion((prev) => prev + 1)
        // Invalidate unread counts để cập nhật contact requests count
        invalidateQueries.unreadCounts(queryClient, session?.user?.id)
      }
    })

    return () => {
      detachNew?.()
      detachUpsert?.()
      detachAssigned?.()
      detachRemove?.()
    }
  }, [session?.user?.id, on, queryClient])

  useEffect(() => {
    if (!socket) {
      return
    }

    const handleConnect = () => setIsConnected(true)
    const handleDisconnect = () => setIsConnected(false)

    socket.on("connect", handleConnect)
    socket.on("disconnect", handleDisconnect)

    return () => {
      socket.off("connect", handleConnect)
      socket.off("disconnect", handleDisconnect)
    }
  }, [socket])

  return { socket, isSocketConnected: isConnected, cacheVersion }
}

