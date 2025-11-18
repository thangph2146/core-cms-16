"use client"

import { useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { useQueryClient } from "@tanstack/react-query"
import { useSocket } from "@/hooks/use-socket"
import { logger } from "@/lib/config"
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
): boolean {
  let updated = false
  const queries = queryClient.getQueriesData<DataTableResult<PostRow>>({
    queryKey: queryKeys.adminPosts.all() as unknown[],
  })

  logger.debug("Found post queries to update", { count: queries.length })

  for (const [key, data] of queries) {
    if (!Array.isArray(key) || key.length < 2) continue
    const params = key[1] as AdminPostsListParams | undefined
    if (!params || !data) {
      logger.debug("Skipping post query", { hasParams: !!params, hasData: !!data })
      continue
    }
    const next = updater({ key, params, data })
    if (next) {
      logger.debug("Setting post query data", {
        queryKey: key.slice(0, 2),
        oldRowsCount: data.rows.length,
        newRowsCount: next.rows.length,
        oldTotal: data.total,
        newTotal: next.total,
      })
      queryClient.setQueryData(key, next)
      updated = true
    } else {
      logger.debug("Post updater returned null, skipping update")
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

      logger.debug("Received post:upsert", {
        postId: post.id,
        previousStatus,
        newStatus,
        rowStatus,
        deletedAt: post.deletedAt,
      })

      const updated = updatePostQueries(queryClient, ({ params, data }) => {
        const matches = matchesFilters(params.filters, post) && matchesSearch(params.search, post)
        const includesByStatus = shouldIncludeInStatus(params.status, rowStatus)
        const existingIndex = data.rows.findIndex((r) => r.id === post.id)
        const shouldInclude = matches && includesByStatus

        logger.debug("Processing post update", {
          postId: post.id,
          viewStatus: params.status,
          rowStatus,
          includesByStatus,
          existingIndex,
          shouldInclude,
        })

        if (existingIndex === -1 && !shouldInclude) {
          // Nothing to update for this page
          return null
        }

        const next: DataTableResult<PostRow> = { ...data }
        let total = next.total
        let rows = next.rows

        if (shouldInclude) {
          if (existingIndex >= 0) {
            // Thay thế hoàn toàn với dữ liệu từ server (server là source of truth)
            // Không merge để tránh conflict với optimistic updates
            const updatedRows = [...rows]
            updatedRows[existingIndex] = post
            rows = updatedRows
          } else if (params.page === 1) {
            rows = insertRowIntoPage(rows, post, next.limit)
            total = total + 1
          } else {
            // On pages > 1 we only adjust total if post previously existed
            if (previousStatus && previousStatus !== rowStatus) {
              // If moved to this status from different view and this page is not 1, we can't insert accurately
              // Leave as is until manual refresh
            }
          }
        } else if (existingIndex >= 0) {
          // Post đang ở trong list nhưng không match với view hiện tại (ví dụ: chuyển từ active sang deleted)
          // Remove khỏi page này
          logger.debug("Removing post from view", {
            postId: post.id,
            viewStatus: params.status,
            rowStatus,
          })
          const result = removeRowFromPage(rows, post.id)
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

        logger.debug("Cache updated for post", {
          postId: post.id,
          rowsCount: result.rows.length,
          total: result.total,
          wasRemoved: existingIndex >= 0 && !shouldInclude,
        })

        return result
      })

      if (updated) {
        setCacheVersion((prev) => prev + 1)
      }
    })

    const detachRemove = on<[PostRemovePayload]>("post:remove", (payload) => {
      const { id } = payload as PostRemovePayload
      logger.debug("Received post:remove", { postId: id })

      const updated = updatePostQueries(queryClient, ({ data }) => {
        const result = removeRowFromPage(data.rows, id)
        if (!result.removed) {
          logger.debug("Post not found in current view", { postId: id })
          return null
        }

        const total = Math.max(0, data.total - 1)
        const totalPages = total === 0 ? 0 : Math.ceil(total / data.limit)

        logger.debug("Removed post from cache", {
          postId: id,
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

