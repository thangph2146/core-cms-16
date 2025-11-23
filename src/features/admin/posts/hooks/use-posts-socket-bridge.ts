"use client"

import { useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { useQueryClient } from "@tanstack/react-query"
import { useSocket } from "@/hooks/use-socket"
import { resourceLogger } from "@/lib/config"
import type { PostRow } from "../types"
import type { DataTableResult } from "@/components/tables"
import { queryKeys, type AdminPostsListParams } from "@/lib/query-keys"
import {
  matchesSearch,
  matchesFilters,
  shouldIncludeInStatus,
  insertRowIntoPage,
  removeRowFromPage,
} from "../utils/socket-helpers"

interface PostUpsertPayload {
  post: PostRow
  previousStatus: "active" | "deleted" | null
  newStatus: "active" | "deleted"
}

interface PostRemovePayload {
  id: string
  previousStatus: "active" | "deleted"
}

function updatePostQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  updater: (args: { key: unknown[]; params: AdminPostsListParams; data: DataTableResult<PostRow> }) => DataTableResult<PostRow> | null,
  logUpdates = true,
): boolean {
  let updated = false
  const queries = queryClient.getQueriesData<DataTableResult<PostRow>>({
    queryKey: queryKeys.adminPosts.all() as unknown[],
  })

  for (const [key, data] of queries) {
    if (!Array.isArray(key) || key.length < 2) continue
    const params = key[1] as AdminPostsListParams | undefined
    if (!params || !data) continue
    const next = updater({ key, params, data })
    if (next) {
      queryClient.setQueryData(key, next)
      updated = true
    }
  }

  return updated
}

export function usePostsSocketBridge() {
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

    const detachUpsert = on<[PostUpsertPayload]>("post:upsert", (payload) => {
      const { post, previousStatus, newStatus } = payload as PostUpsertPayload
      const rowStatus: "active" | "deleted" = post.deletedAt ? "deleted" : "active"

      const updated = updatePostQueries(queryClient, ({ params, data }) => {
        const matches = matchesFilters(params.filters, post) && matchesSearch(params.search, post)
        const includesByStatus = shouldIncludeInStatus(params.status, rowStatus)
        const existingIndex = data.rows.findIndex((r) => r.id === post.id)
        const shouldInclude = matches && includesByStatus

        if (existingIndex === -1 && !shouldInclude) {
          return null
        }

        const next: DataTableResult<PostRow> = { ...data }
        let total = next.total
        let rows = next.rows

        if (shouldInclude) {
          if (existingIndex >= 0) {
            rows = [...rows]
            rows[existingIndex] = post
          } else if (params.page === 1) {
            rows = insertRowIntoPage(rows, post, next.limit)
            total = total + 1
          }
        } else if (existingIndex >= 0) {
          const result = removeRowFromPage(rows, post.id)
          rows = result.rows
          if (result.removed) {
            total = Math.max(0, total - 1)
          }
        } else {
          return null
        }

        const totalPages = total === 0 ? 0 : Math.ceil(total / next.limit)

        return { ...next, rows, total, totalPages }
      })

      if (updated) {
        setCacheVersion((prev) => prev + 1)
      }
    })

    // Batch upsert handler (tối ưu cho bulk operations)
    const detachBatchUpsert = on<[{ posts: PostUpsertPayload[] }]>("post:batch-upsert", (payload) => {
      const { posts } = payload as { posts: PostUpsertPayload[] }

      let anyUpdated = false
      for (const { post, previousStatus } of posts) {
        const rowStatus: "active" | "deleted" = post.deletedAt ? "deleted" : "active"
        const updated = updatePostQueries(
          queryClient,
          ({ params, data }) => {
            const matches = matchesFilters(params.filters, post) && matchesSearch(params.search, post)
            const includesByStatus = shouldIncludeInStatus(params.status, rowStatus)
            const existingIndex = data.rows.findIndex((r) => r.id === post.id)
            const shouldInclude = matches && includesByStatus

            if (existingIndex === -1 && !shouldInclude) {
              return null
            }

            const next: DataTableResult<PostRow> = { ...data }
            let total = next.total
            let rows = next.rows

            if (shouldInclude) {
              if (existingIndex >= 0) {
                rows = [...rows]
                rows[existingIndex] = post
              } else if (params.page === 1) {
                rows = insertRowIntoPage(rows, post, next.limit)
                total = total + 1
              }
            } else if (existingIndex >= 0) {
              const result = removeRowFromPage(rows, post.id)
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
          false, // Không log từng query update trong batch
        )
        if (updated) anyUpdated = true
      }

      if (anyUpdated) {
        setCacheVersion((prev) => prev + 1)
      }
    })

    const detachRemove = on<[PostRemovePayload]>("post:remove", (payload) => {
      const { id } = payload as PostRemovePayload

      const updated = updatePostQueries(queryClient, ({ data }) => {
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

    // Batch remove handler (tối ưu cho bulk operations)
    const detachBatchRemove = on<[{ posts: PostRemovePayload[] }]>("post:batch-remove", (payload) => {
      const { posts } = payload as { posts: PostRemovePayload[] }

      let anyUpdated = false
      for (const { id } of posts) {
        const updated = updatePostQueries(
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
        setCacheVersion((prev) => prev + 1)
      }
    })

    return () => {
      detachUpsert?.()
      detachBatchUpsert?.()
      detachRemove?.()
      detachBatchRemove?.()
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

