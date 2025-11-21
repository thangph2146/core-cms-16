/**
 * Custom hook để xử lý các actions của comments
 * Tách logic xử lý actions ra khỏi component chính để code sạch hơn
 */

import { useCallback, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/axios"
import { apiRoutes } from "@/lib/api/routes"
import { queryKeys } from "@/lib/query-keys"
import { runResourceRefresh, useResourceBulkProcessing } from "@/features/admin/resources/hooks"
import type { ResourceRefreshHandler } from "@/features/admin/resources/types"
import type { CommentRow } from "../types"
import type { DataTableResult } from "@/components/tables"
import type { FeedbackVariant } from "@/components/dialogs"
import { COMMENT_MESSAGES } from "../constants/messages"
import { logger } from "@/lib/config"

interface UseCommentActionsOptions {
  canApprove: boolean
  canDelete: boolean
  canRestore: boolean
  canManage: boolean
  isSocketConnected: boolean
  showFeedback: (variant: FeedbackVariant, title: string, description?: string, details?: string) => void
}

export function useCommentActions({
  canApprove,
  canDelete,
  canRestore,
  canManage,
  isSocketConnected,
  showFeedback,
}: UseCommentActionsOptions) {
  const queryClient = useQueryClient()
  const [approvingComments, setApprovingComments] = useState<Set<string>>(new Set())
  const [unapprovingComments, setUnapprovingComments] = useState<Set<string>>(new Set())
  const [togglingComments, setTogglingComments] = useState<Set<string>>(new Set())
  const [deletingComments, setDeletingComments] = useState<Set<string>>(new Set())
  const [restoringComments, setRestoringComments] = useState<Set<string>>(new Set())
  const [hardDeletingComments, setHardDeletingComments] = useState<Set<string>>(new Set())

  const { bulkState, startBulkProcessing, stopBulkProcessing } = useResourceBulkProcessing()

  const handleToggleApprove = useCallback(
    async (row: CommentRow, newStatus: boolean, refresh: ResourceRefreshHandler) => {
      if (!canApprove) {
        showFeedback("error", COMMENT_MESSAGES.NO_PERMISSION, COMMENT_MESSAGES.NO_APPROVE_PERMISSION)
        return
      }

      // Track loading state
      const setLoadingState = newStatus ? setApprovingComments : setUnapprovingComments
      setTogglingComments((prev) => new Set(prev).add(row.id))
      setLoadingState((prev) => new Set(prev).add(row.id))

      // Optimistic update chỉ khi không có socket (fallback)
      if (!isSocketConnected) {
        queryClient.setQueriesData<DataTableResult<CommentRow>>(
          { queryKey: queryKeys.adminComments.all() as unknown[] },
          (oldData) => {
            if (!oldData) return oldData
            const updatedRows = oldData.rows.map((r) =>
              r.id === row.id ? { ...r, approved: newStatus } : r
            )
            return { ...oldData, rows: updatedRows }
          },
        )
      }

      try {
        if (newStatus) {
          await apiClient.post(apiRoutes.comments.approve(row.id))
          showFeedback("success", COMMENT_MESSAGES.APPROVE_SUCCESS, `Đã duyệt bình luận từ ${row.authorName || row.authorEmail}`)
        } else {
          await apiClient.post(apiRoutes.comments.unapprove(row.id))
          showFeedback("success", COMMENT_MESSAGES.UNAPPROVE_SUCCESS, `Đã hủy duyệt bình luận từ ${row.authorName || row.authorEmail}`)
        }
        await runResourceRefresh({ refresh, resource: "comments" })
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : COMMENT_MESSAGES.UNKNOWN_ERROR
        showFeedback("error", newStatus ? COMMENT_MESSAGES.APPROVE_ERROR : COMMENT_MESSAGES.UNAPPROVE_ERROR, `Không thể ${newStatus ? "duyệt" : "hủy duyệt"} bình luận`, errorMessage)
        
        // Rollback optimistic update nếu có lỗi
        if (isSocketConnected) {
          queryClient.invalidateQueries({ queryKey: queryKeys.adminComments.all() })
        }
      } finally {
        setTogglingComments((prev) => {
          const next = new Set(prev)
          next.delete(row.id)
          return next
        })
        setLoadingState((prev) => {
          const next = new Set(prev)
          next.delete(row.id)
          return next
        })
      }
    },
    [canApprove, isSocketConnected, showFeedback, queryClient],
  )

  const executeSingleAction = useCallback(
    async (
      action: "delete" | "restore" | "hard-delete",
      row: CommentRow,
      refresh: ResourceRefreshHandler
    ): Promise<void> => {
      const actionConfig = {
        delete: {
          permission: canDelete,
          endpoint: apiRoutes.comments.bulk,
          payload: { action: "delete", ids: [row.id] },
          successTitle: COMMENT_MESSAGES.DELETE_SUCCESS,
          successDescription: `Đã xóa bình luận của ${row.authorName || row.authorEmail}`,
          errorTitle: COMMENT_MESSAGES.DELETE_ERROR,
          errorDescription: `Không thể xóa bình luận của ${row.authorName || row.authorEmail}`,
        },
        restore: {
          permission: canRestore,
          endpoint: apiRoutes.comments.bulk,
          payload: { action: "restore", ids: [row.id] },
          successTitle: COMMENT_MESSAGES.RESTORE_SUCCESS,
          successDescription: `Đã khôi phục bình luận của ${row.authorName || row.authorEmail}`,
          errorTitle: COMMENT_MESSAGES.RESTORE_ERROR,
          errorDescription: `Không thể khôi phục bình luận của ${row.authorName || row.authorEmail}`,
        },
        "hard-delete": {
          permission: canManage,
          endpoint: apiRoutes.comments.bulk,
          payload: { action: "hard-delete", ids: [row.id] },
          successTitle: COMMENT_MESSAGES.HARD_DELETE_SUCCESS,
          successDescription: `Đã xóa vĩnh viễn bình luận của ${row.authorName || row.authorEmail}`,
          errorTitle: COMMENT_MESSAGES.HARD_DELETE_ERROR,
          errorDescription: `Không thể xóa vĩnh viễn bình luận của ${row.authorName || row.authorEmail}`,
        },
      }[action]

      if (!actionConfig.permission) return

      // Track loading state
      const setLoadingState = action === "delete"
        ? setDeletingComments
        : action === "restore"
        ? setRestoringComments
        : setHardDeletingComments

      setLoadingState((prev) => new Set(prev).add(row.id))

      try {
        await apiClient.post(actionConfig.endpoint, actionConfig.payload)
        showFeedback("success", actionConfig.successTitle, actionConfig.successDescription)
        await runResourceRefresh({ refresh, resource: "comments" })
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : COMMENT_MESSAGES.UNKNOWN_ERROR
        showFeedback("error", actionConfig.errorTitle, actionConfig.errorDescription, errorMessage)
        if (action === "restore") {
          logger.error(`Failed to ${action} comment`, error as Error)
        } else {
          throw error
        }
      } finally {
        setLoadingState((prev) => {
          const next = new Set(prev)
          next.delete(row.id)
          return next
        })
      }
    },
    [canDelete, canRestore, canManage, showFeedback],
  )

  const executeBulkAction = useCallback(
    async (
      action: "delete" | "restore" | "hard-delete" | "approve" | "unapprove",
      ids: string[],
      refresh: ResourceRefreshHandler,
      clearSelection: () => void
    ) => {
      if (ids.length === 0) return

      if (!startBulkProcessing()) return

      try {
        await apiClient.post(apiRoutes.comments.bulk, { action, ids })

        const messages = {
          approve: { title: COMMENT_MESSAGES.BULK_APPROVE_SUCCESS, description: `Đã duyệt ${ids.length} bình luận` },
          unapprove: { title: COMMENT_MESSAGES.BULK_UNAPPROVE_SUCCESS, description: `Đã hủy duyệt ${ids.length} bình luận` },
          restore: { title: COMMENT_MESSAGES.BULK_RESTORE_SUCCESS, description: `Đã khôi phục ${ids.length} bình luận` },
          delete: { title: COMMENT_MESSAGES.BULK_DELETE_SUCCESS, description: `Đã xóa ${ids.length} bình luận` },
          "hard-delete": { title: COMMENT_MESSAGES.BULK_HARD_DELETE_SUCCESS, description: `Đã xóa vĩnh viễn ${ids.length} bình luận` },
        }

        const message = messages[action]
        showFeedback("success", message.title, message.description)
        clearSelection()

        await runResourceRefresh({ refresh, resource: "comments" })
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : COMMENT_MESSAGES.UNKNOWN_ERROR
        const errorTitles = {
          approve: COMMENT_MESSAGES.BULK_APPROVE_ERROR,
          unapprove: COMMENT_MESSAGES.BULK_UNAPPROVE_ERROR,
          restore: COMMENT_MESSAGES.BULK_RESTORE_ERROR,
          delete: COMMENT_MESSAGES.BULK_DELETE_ERROR,
          "hard-delete": COMMENT_MESSAGES.BULK_HARD_DELETE_ERROR,
        }
        showFeedback("error", errorTitles[action], `Không thể thực hiện thao tác cho ${ids.length} bình luận`, errorMessage)
        if (action !== "restore") {
          throw error
        }
      } finally {
        stopBulkProcessing()
      }
    },
    [showFeedback, startBulkProcessing, stopBulkProcessing],
  )

  return {
    handleToggleApprove,
    executeSingleAction,
    executeBulkAction,
    approvingComments,
    unapprovingComments,
    togglingComments,
    deletingComments,
    restoringComments,
    hardDeletingComments,
    bulkState,
  }
}

