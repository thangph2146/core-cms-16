"use client"

import { useEffect, useMemo, useState, useRef } from "react"
import { useSession } from "next-auth/react"
import { useQueryClient } from "@tanstack/react-query"
import { useSocket } from "@/hooks/use-socket"
import { resourceLogger } from "@/lib/config"
import type { UserRow } from "../types"
import type { DataTableResult } from "@/components/tables"
import { queryKeys, type AdminUsersListParams } from "@/lib/query-keys"
import {
  matchesSearch,
  matchesFilters,
  shouldIncludeInStatus,
  insertRowIntoPage,
  removeRowFromPage,
} from "../utils/socket-helpers"

interface UserUpsertPayload {
  user: UserRow
  previousStatus: "active" | "deleted" | null
  newStatus: "active" | "deleted"
}

interface UserRemovePayload {
  id: string
  previousStatus: "active" | "deleted"
}

function updateUserQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  updater: (args: { key: unknown[]; params: AdminUsersListParams; data: DataTableResult<UserRow> }) => DataTableResult<UserRow> | null,
  logUpdates = true,
): boolean {
  let updated = false
  const queries = queryClient.getQueriesData<DataTableResult<UserRow>>({
    queryKey: queryKeys.adminUsers.all() as unknown[],
  })

  for (const [key, data] of queries) {
    if (!Array.isArray(key) || key.length < 2) continue
    const params = key[1] as AdminUsersListParams | undefined
    if (!params || !data) continue
    const next = updater({ key, params, data })
    if (next) {
      if (logUpdates) {
      resourceLogger.socket({
        resource: "users",
        event: "user:query-updated",
        action: "socket-update",
        payload: {
          queryKey: key.slice(0, 2),
          oldRowsCount: data.rows.length,
          newRowsCount: next.rows.length,
          oldTotal: data.total,
          newTotal: next.total,
        },
      })
      }
      queryClient.setQueryData(key, next)
      updated = true
    }
  }

  return updated
}

export function useUsersSocketBridge() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const primaryRole = useMemo(() => session?.roles?.[0]?.name ?? null, [session?.roles])
  const [cacheVersion, setCacheVersion] = useState(0)
  const cacheVersionTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Debounced cacheVersion update để tránh duplicate refreshes khi có nhiều socket events
  const updateCacheVersionDebounced = useMemo(() => {
    return () => {
      if (cacheVersionTimeoutRef.current) {
        clearTimeout(cacheVersionTimeoutRef.current)
      }
      cacheVersionTimeoutRef.current = setTimeout(() => {
        setCacheVersion((prev) => prev + 1)
        cacheVersionTimeoutRef.current = null
      }, 150) // Debounce 150ms để batch nhiều socket events
    }
  }, [])

  const { socket, on } = useSocket({
    userId: session?.user?.id,
    role: primaryRole,
  })

  const [isConnected, setIsConnected] = useState<boolean>(() => Boolean(socket?.connected))

  useEffect(() => {
    if (!session?.user?.id) return

    const detachUpsert = on<[UserUpsertPayload]>("user:upsert", (payload) => {
      const { user } = payload as UserUpsertPayload
      const rowStatus: "active" | "deleted" = user.deletedAt ? "deleted" : "active"

      const updated = updateUserQueries(queryClient, ({ params, data }) => {
        const matches = matchesFilters(params.filters, user) && matchesSearch(params.search, user)
        const includesByStatus = shouldIncludeInStatus(params.status, rowStatus)
        const existingIndex = data.rows.findIndex((r) => r.id === user.id)
        const shouldInclude = matches && includesByStatus

        // Log processing được xử lý trong các log khác

        if (existingIndex === -1 && !shouldInclude) {
          // Nothing to update for this page
          return null
        }

        const next: DataTableResult<UserRow> = { ...data }
        let total = next.total
        let rows = next.rows

        if (shouldInclude) {
          if (existingIndex >= 0) {
            // Thay thế hoàn toàn với dữ liệu từ server (server là source of truth)
            // Socket event luôn có dữ liệu mới nhất từ server sau khi edit
            const updatedRows = [...rows]
            updatedRows[existingIndex] = user
            rows = updatedRows
          } else if (params.page === 1) {
            rows = insertRowIntoPage(rows, user, next.limit)
            total = total + 1
          } else {
            // On pages > 1 we only adjust total if user previously existed
          }
        } else if (existingIndex >= 0) {
          // User đang ở trong list nhưng không match với view hiện tại (ví dụ: chuyển từ active sang deleted)
          // Remove khỏi page này
          const result = removeRowFromPage(rows, user.id)
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
        // Cache đã được update qua setQueryData, debounce cacheVersion update
        updateCacheVersionDebounced()
      }
    })

    // Batch upsert handler (tối ưu cho bulk operations - giảm log dư thừa)
    const detachBatchUpsert = on<[{ users: UserUpsertPayload[] }]>("user:batch-upsert", (payload) => {
      const { users } = payload as { users: UserUpsertPayload[] }

      let anyUpdated = false
      for (const { user } of users) {
        const rowStatus: "active" | "deleted" = user.deletedAt ? "deleted" : "active"
        const updated = updateUserQueries(
          queryClient,
          ({ params, data }) => {
            const matches = matchesFilters(params.filters, user) && matchesSearch(params.search, user)
            const includesByStatus = shouldIncludeInStatus(params.status, rowStatus)
            const existingIndex = data.rows.findIndex((r) => r.id === user.id)
            const shouldInclude = matches && includesByStatus

            if (existingIndex === -1 && !shouldInclude) {
              return null
            }

            const next: DataTableResult<UserRow> = { ...data }
            let total = next.total
            let rows = next.rows

            if (shouldInclude) {
              if (existingIndex >= 0) {
                rows = [...rows]
                rows[existingIndex] = user
              } else if (params.page === 1) {
                rows = insertRowIntoPage(rows, user, next.limit)
                total = total + 1
              }
            } else if (existingIndex >= 0) {
              const result = removeRowFromPage(rows, user.id)
              rows = result.rows
              if (result.removed) {
                total = Math.max(0, total - 1)
              }
            } else {
              return null
            }

            const totalPages = total === 0 ? 0 : Math.ceil(total / next.limit)
            return { ...next, rows, total, totalPages }
          },
          false, // Không log từng query update trong batch để giảm log dư thừa
        )
        if (updated) anyUpdated = true
      }

      if (anyUpdated) {
        // Cache đã được update qua setQueryData, debounce cacheVersion update
        updateCacheVersionDebounced()
      }
    })

    const detachRemove = on<[UserRemovePayload]>("user:remove", (payload) => {
      const { id } = payload as UserRemovePayload

      const updated = updateUserQueries(queryClient, ({ data }) => {
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
        // Cache đã được update qua setQueryData, debounce cacheVersion update
        updateCacheVersionDebounced()
      }
    })

    // Batch remove handler (tối ưu cho bulk operations)
    const detachBatchRemove = on<[{ users: UserRemovePayload[] }]>("user:batch-remove", (payload) => {
      const { users } = payload as { users: UserRemovePayload[] }

      let anyUpdated = false
      for (const { id } of users) {
        const updated = updateUserQueries(
          queryClient,
          ({ data }) => {
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
          },
          false, // Không log từng query update trong batch
        )
        if (updated) anyUpdated = true
      }

      if (anyUpdated) {
        // Cache đã được update qua setQueryData, debounce cacheVersion update
        updateCacheVersionDebounced()
      }
    })

    return () => {
      // Cleanup timeout khi unmount
      if (cacheVersionTimeoutRef.current) {
        clearTimeout(cacheVersionTimeoutRef.current)
      }
      detachUpsert?.()
      detachBatchUpsert?.()
      detachRemove?.()
      detachBatchRemove?.()
    }
  }, [session?.user?.id, on, queryClient, updateCacheVersionDebounced])

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

