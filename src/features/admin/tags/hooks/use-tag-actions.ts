/**
 * Custom hook để xử lý các actions của tags
 * Tách logic xử lý actions ra khỏi component chính để code sạch hơn
 */

import { useCallback, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/axios"
import { apiRoutes } from "@/lib/api/routes"
import { queryKeys } from "@/lib/query-keys"
import { resourceLogger } from "@/lib/config"
import type { TagRow } from "../types"
import type { DataTableResult } from "@/components/tables"
import type { FeedbackVariant } from "@/components/dialogs"
import { TAG_MESSAGES } from "../constants/messages"
import { runResourceRefresh, useResourceBulkProcessing } from "@/features/admin/resources/hooks"
import type { ResourceRefreshHandler } from "@/features/admin/resources/types"

interface UseTagActionsOptions {
  canDelete: boolean
  canRestore: boolean
  canManage: boolean
  isSocketConnected: boolean
  showFeedback: (variant: FeedbackVariant, title: string, description?: string, details?: string) => void
}

export function useTagActions({
  canDelete,
  canRestore,
  canManage,
  isSocketConnected,
  showFeedback,
}: UseTagActionsOptions) {
  const queryClient = useQueryClient()
  const [deletingTags, setDeletingTags] = useState<Set<string>>(new Set())
  const [restoringTags, setRestoringTags] = useState<Set<string>>(new Set())
  const [hardDeletingTags, setHardDeletingTags] = useState<Set<string>>(new Set())

  const { bulkState, startBulkProcessing, stopBulkProcessing } = useResourceBulkProcessing()

  const executeSingleAction = useCallback(
    async (
      action: "delete" | "restore" | "hard-delete",
      row: TagRow,
      refresh: ResourceRefreshHandler
    ): Promise<void> => {
      const actionConfig = {
        delete: {
          permission: canDelete,
          endpoint: apiRoutes.tags.delete(row.id),
          method: "delete" as const,
          successTitle: TAG_MESSAGES.DELETE_SUCCESS,
          successDescription: `Đã xóa thẻ tag ${row.name}`,
          errorTitle: TAG_MESSAGES.DELETE_ERROR,
          errorDescription: `Không thể xóa thẻ tag ${row.name}`,
        },
        restore: {
          permission: canRestore,
          endpoint: apiRoutes.tags.restore(row.id),
          method: "post" as const,
          successTitle: TAG_MESSAGES.RESTORE_SUCCESS,
          successDescription: `Đã khôi phục thẻ tag "${row.name}"`,
          errorTitle: TAG_MESSAGES.RESTORE_ERROR,
          errorDescription: `Không thể khôi phục thẻ tag "${row.name}"`,
        },
        "hard-delete": {
          permission: canManage,
          endpoint: apiRoutes.tags.hardDelete(row.id),
          method: "delete" as const,
          successTitle: TAG_MESSAGES.HARD_DELETE_SUCCESS,
          successDescription: `Đã xóa vĩnh viễn thẻ tag ${row.name}`,
          errorTitle: TAG_MESSAGES.HARD_DELETE_ERROR,
          errorDescription: `Không thể xóa vĩnh viễn thẻ tag ${row.name}`,
        },
      }[action]

      if (!actionConfig.permission) return

      // Track loading state
      const setLoadingState = action === "delete" 
        ? setDeletingTags 
        : action === "restore" 
        ? setRestoringTags 
        : setHardDeletingTags

      setLoadingState((prev) => new Set(prev).add(row.id))

      resourceLogger.actionFlow({
        resource: "tags",
        action: action,
        step: "start",
        metadata: { tagId: row.id, tagName: row.name, socketConnected: isSocketConnected },
      })

      try {
        if (actionConfig.method === "delete") {
          await apiClient.delete(actionConfig.endpoint)
        } else {
          await apiClient.post(actionConfig.endpoint)
        }

        showFeedback("success", actionConfig.successTitle, actionConfig.successDescription)

        // Invalidate và refetch queries - Next.js 16 pattern: đảm bảo data fresh
        // Đảm bảo table và detail luôn hiển thị data mới sau mutations
        await queryClient.invalidateQueries({ queryKey: queryKeys.adminTags.all(), refetchType: "active" })
        await queryClient.refetchQueries({ queryKey: queryKeys.adminTags.all(), type: "active" })
        
        // Socket events sẽ tự động update cache nếu có, nhưng vẫn cần invalidate để đảm bảo data fresh
        if (!isSocketConnected) {
          await runResourceRefresh({ refresh, resource: "tags" })
        }

        resourceLogger.actionFlow({
          resource: "tags",
          action: action,
          step: "success",
          metadata: { tagId: row.id, tagName: row.name },
        })
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : TAG_MESSAGES.UNKNOWN_ERROR
        showFeedback("error", actionConfig.errorTitle, actionConfig.errorDescription, errorMessage)
        
        resourceLogger.actionFlow({
          resource: "tags",
          action: action,
          step: "error",
          metadata: { 
            tagId: row.id, 
            tagName: row.name, 
            error: errorMessage,
            errorStack: error instanceof Error ? error.stack : undefined,
          },
        })

        // Chỉ throw error cho non-restore actions để không crash UI
        if (action !== "restore") {
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
    [canDelete, canRestore, canManage, isSocketConnected, showFeedback, queryClient],
  )

  const executeBulkAction = useCallback(
    async (
      action: "delete" | "restore" | "hard-delete",
      ids: string[],
      refresh: ResourceRefreshHandler,
      clearSelection: () => void
    ) => {
      if (ids.length === 0) return
      if (!startBulkProcessing()) return

      resourceLogger.actionFlow({
        resource: "tags",
        action: action === "delete" ? "bulk-delete" : action === "restore" ? "bulk-restore" : "bulk-hard-delete",
        step: "start",
        metadata: { count: ids.length, tagIds: ids, socketConnected: isSocketConnected },
      })

      try {
        const response = await apiClient.post(apiRoutes.tags.bulk, { action, ids })

        const result = response.data?.data
        const affected = result?.affected ?? 0

        // Nếu không có tag nào được xử lý (affected === 0), hiển thị thông báo
        if (affected === 0) {
          const actionText = action === "restore" ? "khôi phục" : action === "delete" ? "xóa" : "xóa vĩnh viễn"
          const errorMessage = result?.message || `Không có thẻ tag nào được ${actionText}`
          showFeedback("error", "Không có thay đổi", errorMessage)
          clearSelection()
          resourceLogger.actionFlow({
            resource: "tags",
            action: action === "delete" ? "bulk-delete" : action === "restore" ? "bulk-restore" : "bulk-hard-delete",
            step: "error",
            metadata: { requestedCount: ids.length, affectedCount: 0, error: errorMessage, requestedIds: ids },
          })
          return
        }

        // Hiển thị success message với số lượng thực tế đã xử lý và message từ server
        const actionText = action === "restore" ? "khôi phục" : action === "delete" ? "xóa" : "xóa vĩnh viễn"
        const successMessage = result?.message || `Đã ${actionText} ${affected} thẻ tag`
        const messages = {
          restore: { title: TAG_MESSAGES.BULK_RESTORE_SUCCESS, description: successMessage },
          delete: { title: TAG_MESSAGES.BULK_DELETE_SUCCESS, description: successMessage },
          "hard-delete": { title: TAG_MESSAGES.BULK_HARD_DELETE_SUCCESS, description: successMessage },
        }

        const message = messages[action]
        showFeedback("success", message.title, message.description)
        clearSelection()

        resourceLogger.actionFlow({
          resource: "tags",
          action: action === "delete" ? "bulk-delete" : action === "restore" ? "bulk-restore" : "bulk-hard-delete",
          step: "success",
          metadata: { requestedCount: ids.length, affectedCount: affected },
        })

        // Invalidate và refetch queries - Next.js 16 pattern: đảm bảo data fresh
        // Đảm bảo table luôn hiển thị data mới sau bulk mutations
        await queryClient.invalidateQueries({ queryKey: queryKeys.adminTags.all(), refetchType: "active" })
        await queryClient.refetchQueries({ queryKey: queryKeys.adminTags.all(), type: "active" })
        
        // Socket events sẽ tự động update cache nếu có, nhưng vẫn cần invalidate để đảm bảo data fresh
        if (!isSocketConnected) {
          await runResourceRefresh({ refresh, resource: "tags" })
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : TAG_MESSAGES.UNKNOWN_ERROR
        const errorTitles = {
          restore: TAG_MESSAGES.BULK_RESTORE_ERROR,
          delete: TAG_MESSAGES.BULK_DELETE_ERROR,
          "hard-delete": TAG_MESSAGES.BULK_HARD_DELETE_ERROR,
        }
        showFeedback("error", errorTitles[action], `Không thể thực hiện thao tác cho ${ids.length} thẻ tag`, errorMessage)
        
        resourceLogger.actionFlow({
          resource: "tags",
          action: action === "delete" ? "bulk-delete" : action === "restore" ? "bulk-restore" : "bulk-hard-delete",
          step: "error",
          metadata: { count: ids.length, tagIds: ids, error: errorMessage },
        })

        if (action !== "restore") {
          throw error
        }
      } finally {
        stopBulkProcessing()
      }
    },
    [showFeedback, startBulkProcessing, stopBulkProcessing, isSocketConnected, queryClient],
  )

  return {
    executeSingleAction,
    executeBulkAction,
    deletingTags,
    restoringTags,
    hardDeletingTags,
    bulkState,
  }
}

