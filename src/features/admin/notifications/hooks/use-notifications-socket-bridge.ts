"use client"

import { useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { useQueryClient } from "@tanstack/react-query"
import { useSocket } from "@/hooks/use-socket"
import { logger } from "@/lib/config"
import type { NotificationRow } from "../types"
import type { DataTableResult } from "@/components/tables"
import { queryKeys } from "@/lib/query-keys"
import {
  insertRowIntoPage,
  removeRowFromPage,
  convertSocketPayloadToRow,
} from "../utils/socket-helpers"

interface NotificationUpsertPayload {
  id: string
  kind: string
  title: string
  description?: string | null
  read?: boolean
  toUserId: string
  timestamp?: number
  userEmail?: string | null
  userName?: string | null
}

interface NotificationRemovePayload {
  id: string
}

type NotificationsDeletedSocketPayload =
  | NotificationRemovePayload[]
  | { ids?: string[] | null | undefined }
  | string[]
  | null
  | undefined

function normalizeNotificationsDeletedPayload(payload: NotificationsDeletedSocketPayload): string[] {
  if (!payload) return []

  if (Array.isArray(payload)) {
    if (payload.length === 0) return []

    if (typeof payload[0] === "string") {
      return (payload as string[]).filter((id): id is string => typeof id === "string" && id.length > 0)
    }

    return (payload as NotificationRemovePayload[])
      .map((item) => item?.id)
      .filter((id): id is string => typeof id === "string" && id.length > 0)
  }

  if (Array.isArray(payload.ids)) {
    return payload.ids.filter((id): id is string => typeof id === "string" && id.length > 0)
  }

  return []
}

function updateNotificationQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  updater: (args: { key: unknown[]; data: DataTableResult<NotificationRow> }) => DataTableResult<NotificationRow> | null,
): boolean {
  let updated = false
  const queries = queryClient.getQueriesData<DataTableResult<NotificationRow>>({
    queryKey: queryKeys.notifications.admin() as unknown[],
  })
  
  logger.debug("Found notification queries to update", { count: queries.length })
  
  for (const [key, data] of queries) {
    if (!Array.isArray(key) || key.length < 2) continue
    
    if (!data) {
      logger.debug("Skipping query - no data", { key: key.slice(0, 2) })
      continue
    }
    
    const next = updater({ key, data })
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

function createNotificationUpsertUpdater(
  row: NotificationRow
): (args: { key: unknown[]; data: DataTableResult<NotificationRow> }) => DataTableResult<NotificationRow> | null {
  return ({ data }) => {
    // Safety check: ensure data and rows exist
    if (!data || !Array.isArray(data.rows)) {
      logger.debug("Skipping update - invalid data structure", {
        hasData: !!data,
        hasRows: !!data?.rows,
        isArray: Array.isArray(data?.rows),
      })
      return null
    }

    const existingIndex = data.rows.findIndex((r) => r.id === row.id)

    const next: DataTableResult<NotificationRow> = { ...data }
    let total = next.total
    let rows = next.rows

    if (existingIndex >= 0) {
      // Update existing notification
      const updated = [...rows]
      updated[existingIndex] = row
      rows = updated
    } else if (data.page === 1) {
      // Insert new notification on page 1
      rows = insertRowIntoPage(rows, row, next.limit)
      total = total + 1
    } else {
      // On other pages, just update total if needed
      // Don't insert because we don't know if it should be on this page
      return null
    }

    const totalPages = total === 0 ? 0 : Math.ceil(total / next.limit)

    return {
      ...next,
      rows,
      total,
      totalPages,
    }
  }
}

export function useNotificationsSocketBridge() {
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

    const detachUpsert = on<[NotificationUpsertPayload]>("notification:new", (payload) => {
      // Không log ở đây để tránh duplicate logs (useAdminNotificationsSocketBridge cũng log)
      const row = convertSocketPayloadToRow(payload, payload.userEmail, payload.userName)

      logger.debug("Processing notification update", {
        notificationId: row.id,
      })

      const updated = updateNotificationQueries(queryClient, createNotificationUpsertUpdater(row))

      if (updated) {
        logger.debug("Cache updated for notification", {
          notificationId: row.id,
        })
        setCacheVersion((prev) => prev + 1)
      }
    })

    const detachUpdated = on<[NotificationUpsertPayload]>("notification:updated", (payload) => {
      logger.debug("Received notification:updated", {
        notificationId: payload.id,
        toUserId: payload.toUserId,
      })

      const row = convertSocketPayloadToRow(payload, payload.userEmail, payload.userName)
      const updated = updateNotificationQueries(queryClient, createNotificationUpsertUpdater(row))

      if (updated) {
        setCacheVersion((prev) => prev + 1)
      }
    })

    const detachAdmin = on<[NotificationUpsertPayload]>("notification:admin", (payload) => {
      logger.debug("Received notification:admin", {
        notificationId: payload.id,
        toUserId: payload.toUserId,
      })

      const row = convertSocketPayloadToRow(payload, payload.userEmail, payload.userName)
      const updated = updateNotificationQueries(queryClient, createNotificationUpsertUpdater(row))

      if (updated) {
        setCacheVersion((prev) => prev + 1)
      }
    })

    const detachRemove = on<[NotificationRemovePayload]>("notification:deleted", (payload) => {
      const { id } = payload as NotificationRemovePayload
      logger.debug("Received notification:deleted", { notificationId: id })
      
      const updated = updateNotificationQueries(queryClient, ({ data }) => {
        const result = removeRowFromPage(data.rows, id)
        if (!result.removed) {
          logger.debug("Notification not found in current view", { notificationId: id })
          return null
        }
        
        const total = Math.max(0, data.total - 1)
        const totalPages = total === 0 ? 0 : Math.ceil(total / data.limit)
        
        logger.debug("Removed notification from cache", {
          notificationId: id,
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
      }
    })

    const detachBulkRemove = on<[NotificationsDeletedSocketPayload]>("notifications:deleted", (payload) => {
      const ids = normalizeNotificationsDeletedPayload(payload)
      if (ids.length === 0) {
        logger.warn("Received notifications:deleted without valid payload")
        return
      }

      logger.debug("Received notifications:deleted", { count: ids.length })
      
      const updated = updateNotificationQueries(queryClient, ({ data }) => {
        let rows = data.rows
        let removedCount = 0

        for (const id of ids) {
          const result = removeRowFromPage(rows, id)
          if (result.removed) {
            rows = result.rows
            removedCount++
          }
        }

        if (removedCount === 0) {
          return null
        }
        
        const total = Math.max(0, data.total - removedCount)
        const totalPages = total === 0 ? 0 : Math.ceil(total / data.limit)
        
        logger.debug("Removed notifications from cache", {
          removedCount,
          oldRowsCount: data.rows.length,
          newRowsCount: rows.length,
          oldTotal: data.total,
          newTotal: total,
        })
        
        return {
          ...data,
          rows,
          total,
          totalPages,
        }
      })
      
      if (updated) {
        setCacheVersion((prev) => prev + 1)
      }
    })

    const detachSync = on<[NotificationUpsertPayload[]]>("notifications:sync", (payloads) => {
      // Không log ở đây để tránh duplicate logs (useAdminNotificationsSocketBridge cũng log)
      const updated = updateNotificationQueries(queryClient, ({ data }) => {
        const rows = payloads
          .map((p) => convertSocketPayloadToRow(p, p.userEmail, p.userName))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

        if (rows.length === 0 && data.rows.length === 0) {
          return null
        }

        const limitedRows = data.page === 1 ? rows.slice(0, data.limit) : data.rows
        const total = rows.length
        const totalPages = total === 0 ? 0 : Math.ceil(total / data.limit)

        logger.debug("Synced notifications in cache", {
          rowsCount: limitedRows.length,
          total,
        })

        return {
          ...data,
          rows: limitedRows,
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
      detachUpdated?.()
      detachAdmin?.()
      detachRemove?.()
      detachBulkRemove?.()
      detachSync?.()
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

