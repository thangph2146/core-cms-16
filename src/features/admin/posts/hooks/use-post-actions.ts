/**
 * Custom hook để xử lý các actions của posts
 * Tách logic xử lý actions ra khỏi component chính để code sạch hơn
 */

import { useCallback, useRef, useState } from "react"
import { apiClient } from "@/lib/api/axios"
import { apiRoutes } from "@/lib/api/routes"
import type { PostRow } from "../types"
import type { FeedbackVariant } from "@/components/dialogs"
import { POST_MESSAGES } from "../constants/messages"
import { logger } from "@/lib/config"

interface UsePostActionsOptions {
  canDelete: boolean
  canRestore: boolean
  canManage: boolean
  isSocketConnected: boolean
  showFeedback: (variant: FeedbackVariant, title: string, description?: string, details?: string) => void
}

interface BulkProcessingState {
  isProcessing: boolean
  ref: React.MutableRefObject<boolean>
}

export function usePostActions({
  canDelete,
  canRestore,
  canManage,
  isSocketConnected,
  showFeedback,
}: UsePostActionsOptions) {
  const [isBulkProcessing, setIsBulkProcessing] = useState(false)
  const isBulkProcessingRef = useRef(false)
  const [deletingPosts, setDeletingPosts] = useState<Set<string>>(new Set())
  const [restoringPosts, setRestoringPosts] = useState<Set<string>>(new Set())
  const [hardDeletingPosts, setHardDeletingPosts] = useState<Set<string>>(new Set())

  const bulkState: BulkProcessingState = {
    isProcessing: isBulkProcessing,
    ref: isBulkProcessingRef,
  }

  const startBulkProcessing = useCallback(() => {
    if (isBulkProcessingRef.current) return false
    isBulkProcessingRef.current = true
    setIsBulkProcessing(true)
    return true
  }, [])

  const stopBulkProcessing = useCallback(() => {
    isBulkProcessingRef.current = false
    setIsBulkProcessing(false)
  }, [])

  const executeSingleAction = useCallback(
    async (
      action: "delete" | "restore" | "hard-delete",
      row: PostRow,
      refresh: () => void
    ): Promise<void> => {
      const actionConfig = {
        delete: {
          permission: canDelete,
          endpoint: apiRoutes.posts.delete(row.id),
          method: "delete" as const,
          successTitle: POST_MESSAGES.DELETE_SUCCESS,
          successDescription: `Đã xóa bài viết ${row.title}`,
          errorTitle: POST_MESSAGES.DELETE_ERROR,
          errorDescription: `Không thể xóa bài viết ${row.title}`,
        },
        restore: {
          permission: canRestore,
          endpoint: apiRoutes.posts.restore(row.id),
          method: "post" as const,
          successTitle: POST_MESSAGES.RESTORE_SUCCESS,
          successDescription: `Đã khôi phục bài viết "${row.title}"`,
          errorTitle: POST_MESSAGES.RESTORE_ERROR,
          errorDescription: `Không thể khôi phục bài viết "${row.title}"`,
        },
        "hard-delete": {
          permission: canManage,
          endpoint: apiRoutes.posts.hardDelete(row.id),
          method: "delete" as const,
          successTitle: POST_MESSAGES.HARD_DELETE_SUCCESS,
          successDescription: `Đã xóa vĩnh viễn bài viết ${row.title}`,
          errorTitle: POST_MESSAGES.HARD_DELETE_ERROR,
          errorDescription: `Không thể xóa vĩnh viễn bài viết ${row.title}`,
        },
      }[action]

      if (!actionConfig.permission) return

      // Track loading state
      const setLoadingState = action === "delete" 
        ? setDeletingPosts 
        : action === "restore" 
        ? setRestoringPosts 
        : setHardDeletingPosts

      setLoadingState((prev) => new Set(prev).add(row.id))

      try {
        if (actionConfig.method === "delete") {
          await apiClient.delete(actionConfig.endpoint)
        } else {
          await apiClient.post(actionConfig.endpoint)
        }
        showFeedback("success", actionConfig.successTitle, actionConfig.successDescription)
        if (!isSocketConnected) {
          refresh()
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : POST_MESSAGES.UNKNOWN_ERROR
        showFeedback("error", actionConfig.errorTitle, actionConfig.errorDescription, errorMessage)
        if (action === "restore") {
          logger.error(`Failed to ${action} post`, error as Error)
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
    [canDelete, canRestore, canManage, isSocketConnected, showFeedback],
  )

  const executeBulkAction = useCallback(
    async (
      action: "delete" | "restore" | "hard-delete",
      ids: string[],
      refresh: () => void,
      clearSelection: () => void
    ) => {
      if (ids.length === 0) return

      if (!startBulkProcessing()) return

      try {
        const response = await apiClient.post(apiRoutes.posts.bulk, { action, ids })

        const result = response.data?.data
        const affected = result?.affected ?? 0

        // Nếu không có post nào được xử lý (affected === 0), hiển thị thông báo
        if (affected === 0) {
          const actionText = action === "restore" ? "khôi phục" : action === "delete" ? "xóa" : "xóa vĩnh viễn"
          showFeedback("error", "Không có thay đổi", result?.message || `Không có bài viết nào được ${actionText}`)
          clearSelection()
          refresh()
          return
        }

        // Hiển thị success message với số lượng thực tế đã xử lý
        const messages = {
          restore: { title: POST_MESSAGES.BULK_RESTORE_SUCCESS, description: `Đã khôi phục ${affected} bài viết` },
          delete: { title: POST_MESSAGES.BULK_DELETE_SUCCESS, description: `Đã xóa ${affected} bài viết` },
          "hard-delete": { title: POST_MESSAGES.BULK_HARD_DELETE_SUCCESS, description: `Đã xóa vĩnh viễn ${affected} bài viết` },
        }

        const message = messages[action]
        showFeedback("success", message.title, message.description)
        clearSelection()

        // Luôn refresh để đảm bảo UI được cập nhật (socket có thể không kết nối hoặc chậm)
        refresh()
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : POST_MESSAGES.UNKNOWN_ERROR
        const errorTitles = {
          restore: POST_MESSAGES.BULK_RESTORE_ERROR,
          delete: POST_MESSAGES.BULK_DELETE_ERROR,
          "hard-delete": POST_MESSAGES.BULK_HARD_DELETE_ERROR,
        }
        showFeedback("error", errorTitles[action], `Không thể thực hiện thao tác cho ${ids.length} bài viết`, errorMessage)
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
    executeSingleAction,
    executeBulkAction,
    deletingPosts,
    restoringPosts,
    hardDeletingPosts,
    bulkState,
  }
}

