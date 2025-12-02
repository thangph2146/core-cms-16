"use client"

import { useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { useQueryClient } from "@tanstack/react-query"
import { useSocket } from "@/hooks/use-socket"
import type { SessionRow } from "../types"
import type { DataTableResult } from "@/components/tables"
import { queryKeys, type AdminSessionsListParams } from "@/lib/query-keys"
import {
  matchesSearch,
  matchesFilters,
  shouldIncludeInStatus,
  insertRowIntoPage,
  removeRowFromPage,
} from "../utils/socket-helpers"

interface SessionUpsertPayload {
  session: SessionRow
  previousStatus: "active" | "deleted" | null
  newStatus: "active" | "deleted"
}

interface SessionRemovePayload {
  id: string
  previousStatus: "active" | "deleted"
}

function updateSessionQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  updater: (args: { key: unknown[]; params: AdminSessionsListParams; data: DataTableResult<SessionRow> }) => DataTableResult<SessionRow> | null,
): boolean {
  let updated = false
  const queries = queryClient.getQueriesData<DataTableResult<SessionRow>>({
    queryKey: queryKeys.adminSessions.all() as unknown[],
  })
  
  for (const [key, data] of queries) {
    if (!Array.isArray(key) || key.length < 2) continue
    const params = key[1] as AdminSessionsListParams | undefined
    if (!params || !data) {
      continue
    }
    const next = updater({ key, params, data })
    if (next) {
      queryClient.setQueryData(key, next)
      updated = true
    }
  }
  
  return updated
}

export function useSessionsSocketBridge() {
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

    // Handle session:upsert event (for updates, creates, restores)
    const detachUpsert = on<[SessionUpsertPayload]>("session:upsert", (payload) => {
      const { session: sessionRow, previousStatus } = payload as SessionUpsertPayload
      const rowStatus: "active" | "deleted" = sessionRow.isActive ? "active" : "deleted"

      const updated = updateSessionQueries(queryClient, ({ params, data }) => {
        const matches = matchesFilters(params.filters, sessionRow) && matchesSearch(params.search, sessionRow)
        const includesByStatus = shouldIncludeInStatus(params.status, rowStatus)
        const existingIndex = data.rows.findIndex((row) => row.id === sessionRow.id)
        const shouldInclude = matches && includesByStatus

        if (existingIndex === -1 && !shouldInclude) {
          // Nothing to update for this page
          return null
        }

        const next: DataTableResult<SessionRow> = { ...data }
        let total = next.total
        let rows = next.rows

        if (shouldInclude) {
          if (existingIndex >= 0) {
            const updatedRows = [...rows]
            updatedRows[existingIndex] = sessionRow
            rows = updatedRows
          } else if (params.page === 1) {
            rows = insertRowIntoPage(rows, sessionRow, next.limit)
            total = total + 1
          } else {
            // On pages > 1 we only adjust total if session previously existed
            if (previousStatus && previousStatus !== rowStatus) {
              // If moved to this status from different view and this page is not 1, we can't insert accurately
              // Leave as is until manual refresh
            }
          }
        } else if (existingIndex >= 0) {
          // Session đang ở trong list nhưng không match với view hiện tại (ví dụ: chuyển từ active sang deleted)
          // Remove khỏi page này
          const result = removeRowFromPage(rows, sessionRow.id)
          rows = result.rows
          if (result.removed) {
            total = Math.max(0, total - 1)
          }
        } else {
          return null
        }

        const totalPages = total === 0 ? 0 : Math.ceil(total / next.limit)

        // Luôn return object mới để React Query detect được thay đổi
        const result = {
          ...next,
          rows,
          total,
          totalPages,
        }

        return result
      })

      if (updated) {
        setCacheVersion((prev) => prev + 1)
      }
    })

    // Handle session:remove event (for hard deletes)
    const detachRemove = on<[SessionRemovePayload]>("session:remove", (payload) => {
      const { id } = payload as SessionRemovePayload

      const updated = updateSessionQueries(queryClient, ({ data }) => {
        const result = removeRowFromPage(data.rows, id)
        if (!result.removed) {
          return null
        }

        const total = Math.max(0, data.total - 1)
        const totalPages = total === 0 ? 0 : Math.ceil(total / data.limit)

        return {
          ...data,
          rows: result.rows,
          total,
          totalPages,
        }
      })

      if (updated) {
        setCacheVersion((prev) => prev + 1)
      }
    })

    return () => {
      detachUpsert?.()
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

