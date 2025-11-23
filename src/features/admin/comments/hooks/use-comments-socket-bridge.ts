"use client"

import { useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { useQueryClient } from "@tanstack/react-query"
import { useSocket } from "@/hooks/use-socket"
import { resourceLogger } from "@/lib/config"
import type { CommentRow } from "../types"
import type { DataTableResult } from "@/components/tables"
import { queryKeys, type AdminCommentsListParams } from "@/lib/query-keys"
import type { CommentDetailData } from "../components/comment-detail.client"
import {
  matchesSearch,
  matchesFilters,
  shouldIncludeInStatus,
  insertRowIntoPage,
  removeRowFromPage,
} from "../utils/socket-helpers"

interface CommentUpsertPayload {
  comment: CommentRow
  previousStatus: "active" | "deleted" | null
  newStatus: "active" | "deleted"
}

interface CommentRemovePayload {
  id: string
  previousStatus: "active" | "deleted"
}

function updateCommentQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  updater: (args: { key: unknown[]; params: AdminCommentsListParams; data: DataTableResult<CommentRow> }) => DataTableResult<CommentRow> | null,
): boolean {
  let updated = false
  const queries = queryClient.getQueriesData<DataTableResult<CommentRow>>({
    queryKey: queryKeys.adminComments.all() as unknown[],
  })
  
  for (const [key, data] of queries) {
    if (!Array.isArray(key) || key.length < 2) continue
    const params = key[1] as AdminCommentsListParams | undefined
    if (!params || !data) continue
    const next = updater({ key, params, data })
    if (next) {
      queryClient.setQueryData(key, next)
      updated = true
    }
  }
  
  return updated
}


export function useCommentsSocketBridge() {
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

    const detachUpsert = on<[CommentUpsertPayload]>("comment:upsert", (payload) => {
      const { comment, previousStatus, newStatus } = payload as CommentUpsertPayload
      const rowStatus: "active" | "deleted" = comment.deletedAt ? "deleted" : "active"

      // Update detail query cache nếu có
      const detailQueryKey = queryKeys.adminComments.detail(comment.id)
      const detailData = queryClient.getQueryData<{ data: CommentDetailData }>(detailQueryKey)
      if (detailData) {
        queryClient.setQueryData(detailQueryKey, {
          data: {
            ...detailData.data,
            ...comment,
            approved: comment.approved,
            authorName: comment.authorName,
            authorEmail: comment.authorEmail,
            postTitle: comment.postTitle,
            updatedAt: comment.updatedAt,
            deletedAt: comment.deletedAt,
          },
        })
      }

      const updated = updateCommentQueries(queryClient, ({ params, data }) => {
        const matches = matchesFilters(params.filters, comment) && matchesSearch(params.search, comment)
        const includesByStatus = shouldIncludeInStatus(params.status, rowStatus)
        const existingIndex = data.rows.findIndex((row) => row.id === comment.id)
        const shouldInclude = matches && includesByStatus

        if (existingIndex === -1 && !shouldInclude) {
          // Nothing to update for this page
          return null
        }

        const next: DataTableResult<CommentRow> = { ...data }
        let total = next.total
        let rows = next.rows

        if (shouldInclude) {
          if (existingIndex >= 0) {
            // Thay thế hoàn toàn với dữ liệu từ server (server là source of truth)
            // Không merge để tránh conflict với optimistic updates
            const updated = [...rows]
            updated[existingIndex] = comment
            rows = updated
          } else if (params.page === 1) {
            rows = insertRowIntoPage(rows, comment, next.limit)
            total = total + 1
          } else {
            // On pages > 1 we only adjust total if comment previously existed
            if (previousStatus && previousStatus !== rowStatus) {
              // If moved to this status from different view and this page is not 1, we can't insert accurately
              // Leave as is until manual refresh
            }
          }
        } else if (existingIndex >= 0) {
          // Comment đang ở trong list nhưng không match với view hiện tại (ví dụ: chuyển từ active sang deleted)
          // Remove khỏi page này
          const result = removeRowFromPage(rows, comment.id)
          rows = result.rows
          if (result.removed) {
            total = Math.max(0, total - 1)
          }
        } else {
          return null
        }

        const totalPages = total === 0 ? 0 : Math.ceil(total / next.limit)

        // Luôn return object mới để React Query detect được thay đổi
        return {
          ...next,
          rows,
          total,
          totalPages,
        }
      })
      
      if (updated) {
        setCacheVersion((prev) => prev + 1)
      }
    })

    // Batch upsert handler (tối ưu cho bulk operations)
    const detachBatchUpsert = on<[{ comments: CommentRow[]; previousStatus: "active" | "deleted" | null }]>("comment:batch-upsert", (payload) => {
      const { comments, previousStatus } = payload as { comments: CommentRow[]; previousStatus: "active" | "deleted" | null }

      let anyUpdated = false
      for (const comment of comments) {
        const rowStatus: "active" | "deleted" = comment.deletedAt ? "deleted" : "active"

        // Update detail query cache nếu có
        const detailQueryKey = queryKeys.adminComments.detail(comment.id)
        const detailData = queryClient.getQueryData<{ data: CommentDetailData }>(detailQueryKey)
        if (detailData) {
          queryClient.setQueryData(detailQueryKey, {
            data: {
              ...detailData.data,
              ...comment,
              approved: comment.approved,
              authorName: comment.authorName,
              authorEmail: comment.authorEmail,
              postTitle: comment.postTitle,
              updatedAt: comment.updatedAt,
              deletedAt: comment.deletedAt,
            },
          })
        }

        const updated = updateCommentQueries(queryClient, ({ params, data }) => {
          const matches = matchesFilters(params.filters, comment) && matchesSearch(params.search, comment)
          const includesByStatus = shouldIncludeInStatus(params.status, rowStatus)
          const existingIndex = data.rows.findIndex((row) => row.id === comment.id)
          const shouldInclude = matches && includesByStatus

          if (existingIndex === -1 && !shouldInclude) {
            return null
          }

          const next: DataTableResult<CommentRow> = { ...data }
          let total = next.total
          let rows = next.rows

          if (shouldInclude) {
            if (existingIndex >= 0) {
              const updated = [...rows]
              updated[existingIndex] = comment
              rows = updated
            } else if (params.page === 1) {
              rows = insertRowIntoPage(rows, comment, next.limit)
              total = total + 1
            }
          } else if (existingIndex >= 0) {
            const result = removeRowFromPage(rows, comment.id)
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
        
        if (updated) anyUpdated = true
      }

      if (anyUpdated) {
        setCacheVersion((prev) => prev + 1)
      }
    })

    const detachRemove = on<[CommentRemovePayload]>("comment:remove", (payload) => {
      const { id } = payload as CommentRemovePayload

      // Invalidate detail query cache
      queryClient.invalidateQueries({ queryKey: queryKeys.adminComments.detail(id) })
      
      const updated = updateCommentQueries(queryClient, ({ params, data }) => {
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
      detachBatchUpsert?.()
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
