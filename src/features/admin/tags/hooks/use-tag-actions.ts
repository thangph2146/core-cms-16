/**
 * Custom hook để xử lý các actions của tags
 * Tách logic xử lý actions ra khỏi component chính để code sạch hơn
 */

import { useCallback, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/axios"
import { apiRoutes } from "@/lib/api/routes"
import { queryKeys } from "@/lib/query-keys"
import { logger } from "@/lib/config"
import type { TagRow } from "../types"
import type { FeedbackVariant } from "@/components/dialogs"
import { TAG_MESSAGES } from "../constants/messages"
import { runResourceRefresh, useResourceBulkProcessing } from "@/features/admin/resources/hooks"
import type { ResourceRefreshHandler } from "@/features/admin/resources/types"

interface UseTagActionsOptions {
  canDelete: boolean
  canRestore: boolean
  canManage: boolean
  showFeedback: (variant: FeedbackVariant, title: string, description?: string, details?: string) => void
}

export function useTagActions({
  canDelete,
  canRestore,
  canManage,
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

      try {
        if (actionConfig.method === "delete") {
          await apiClient.delete(actionConfig.endpoint)
        } else {
          await apiClient.post(actionConfig.endpoint)
        }
        showFeedback("success", actionConfig.successTitle, actionConfig.successDescription)
        await runResourceRefresh({ refresh, resource: "tags" })
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : TAG_MESSAGES.UNKNOWN_ERROR
        showFeedback("error", actionConfig.errorTitle, actionConfig.errorDescription, errorMessage)
        if (action === "restore") {
          logger.error(`Failed to ${action} tag`, error as Error)
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
      action: "delete" | "restore" | "hard-delete",
      ids: string[],
      refresh: ResourceRefreshHandler,
      clearSelection: () => void
    ) => {
      if (ids.length === 0) return

      if (!startBulkProcessing()) return

      try {
        await apiClient.post(apiRoutes.tags.bulk, { action, ids })

        const messages = {
          restore: { title: TAG_MESSAGES.BULK_RESTORE_SUCCESS, description: `Đã khôi phục ${ids.length} thẻ tag` },
          delete: { title: TAG_MESSAGES.BULK_DELETE_SUCCESS, description: `Đã xóa ${ids.length} thẻ tag` },
          "hard-delete": { title: TAG_MESSAGES.BULK_HARD_DELETE_SUCCESS, description: `Đã xóa vĩnh viễn ${ids.length} thẻ tag` },
        }

        const message = messages[action]
        showFeedback("success", message.title, message.description)
        clearSelection()

        // Invalidate queries trước để đảm bảo cache được clear
        await queryClient.invalidateQueries({ queryKey: queryKeys.adminTags.all(), refetchType: "all" })
        // Refetch ngay để đảm bảo data mới nhất
        await queryClient.refetchQueries({ queryKey: queryKeys.adminTags.all(), type: "all" })
        
        // Gọi refresh để trigger table reload
        await runResourceRefresh({ refresh, resource: "tags" })
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : TAG_MESSAGES.UNKNOWN_ERROR
        const errorTitles = {
          restore: TAG_MESSAGES.BULK_RESTORE_ERROR,
          delete: TAG_MESSAGES.BULK_DELETE_ERROR,
          "hard-delete": TAG_MESSAGES.BULK_HARD_DELETE_ERROR,
        }
        showFeedback("error", errorTitles[action], `Không thể thực hiện thao tác cho ${ids.length} thẻ tag`, errorMessage)
        if (action !== "restore") {
          throw error
        }
      } finally {
        stopBulkProcessing()
      }
    },
    [showFeedback, startBulkProcessing, stopBulkProcessing, queryClient],
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

