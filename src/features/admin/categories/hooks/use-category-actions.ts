/**
 * Custom hook để xử lý các actions của categories
 * Tách logic xử lý actions ra khỏi component chính để code sạch hơn
 */

import { useCallback, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/axios"
import { apiRoutes } from "@/lib/api/routes"
import { queryKeys } from "@/lib/query-keys"
import type { ResourceRefreshHandler } from "@/features/admin/resources/types"
import { runResourceRefresh, useResourceBulkProcessing } from "@/features/admin/resources/hooks"
import type { CategoryRow } from "../types"
import type { FeedbackVariant } from "@/components/dialogs"
import { CATEGORY_MESSAGES } from "../constants/messages"
import { logger } from "@/lib/config"

interface UseCategoryActionsOptions {
  canDelete: boolean
  canRestore: boolean
  canManage: boolean
  showFeedback: (variant: FeedbackVariant, title: string, description?: string, details?: string) => void
}

export function useCategoryActions({
  canDelete,
  canRestore,
  canManage,
  showFeedback,
}: UseCategoryActionsOptions) {
  const queryClient = useQueryClient()
  const [deletingCategories, setDeletingCategories] = useState<Set<string>>(new Set())
  const [restoringCategories, setRestoringCategories] = useState<Set<string>>(new Set())
  const [hardDeletingCategories, setHardDeletingCategories] = useState<Set<string>>(new Set())

  const { bulkState, startBulkProcessing, stopBulkProcessing } = useResourceBulkProcessing()

  const executeSingleAction = useCallback(
    async (
      action: "delete" | "restore" | "hard-delete",
      row: CategoryRow,
      refresh: ResourceRefreshHandler
    ): Promise<void> => {
      const actionConfig = {
        delete: {
          permission: canDelete,
          endpoint: apiRoutes.categories.delete(row.id),
          method: "delete" as const,
          successTitle: CATEGORY_MESSAGES.DELETE_SUCCESS,
          successDescription: `Đã xóa danh mục ${row.name}`,
          errorTitle: CATEGORY_MESSAGES.DELETE_ERROR,
          errorDescription: `Không thể xóa danh mục ${row.name}`,
        },
        restore: {
          permission: canRestore,
          endpoint: apiRoutes.categories.restore(row.id),
          method: "post" as const,
          successTitle: CATEGORY_MESSAGES.RESTORE_SUCCESS,
          successDescription: `Đã khôi phục danh mục "${row.name}"`,
          errorTitle: CATEGORY_MESSAGES.RESTORE_ERROR,
          errorDescription: `Không thể khôi phục danh mục "${row.name}"`,
        },
        "hard-delete": {
          permission: canManage,
          endpoint: apiRoutes.categories.hardDelete(row.id),
          method: "delete" as const,
          successTitle: CATEGORY_MESSAGES.HARD_DELETE_SUCCESS,
          successDescription: `Đã xóa vĩnh viễn danh mục ${row.name}`,
          errorTitle: CATEGORY_MESSAGES.HARD_DELETE_ERROR,
          errorDescription: `Không thể xóa vĩnh viễn danh mục ${row.name}`,
        },
      }[action]

      if (!actionConfig.permission) return

      // Track loading state
      const setLoadingState = action === "delete" 
        ? setDeletingCategories 
        : action === "restore" 
        ? setRestoringCategories 
        : setHardDeletingCategories

      setLoadingState((prev) => new Set(prev).add(row.id))

      try {
        if (actionConfig.method === "delete") {
          await apiClient.delete(actionConfig.endpoint)
        } else {
          await apiClient.post(actionConfig.endpoint)
        }
        showFeedback("success", actionConfig.successTitle, actionConfig.successDescription)
        await runResourceRefresh({ refresh, resource: "categories" })
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : CATEGORY_MESSAGES.UNKNOWN_ERROR
        showFeedback("error", actionConfig.errorTitle, actionConfig.errorDescription, errorMessage)
        if (action === "restore") {
          logger.error(`Failed to ${action} category`, error as Error)
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
        await apiClient.post(apiRoutes.categories.bulk, { action, ids })

        const messages = {
          restore: { title: CATEGORY_MESSAGES.BULK_RESTORE_SUCCESS, description: `Đã khôi phục ${ids.length} danh mục` },
          delete: { title: CATEGORY_MESSAGES.BULK_DELETE_SUCCESS, description: `Đã xóa ${ids.length} danh mục` },
          "hard-delete": { title: CATEGORY_MESSAGES.BULK_HARD_DELETE_SUCCESS, description: `Đã xóa vĩnh viễn ${ids.length} danh mục` },
        }

        const message = messages[action]
        showFeedback("success", message.title, message.description)
        clearSelection()

        // Invalidate queries trước để đảm bảo cache được clear
        await queryClient.invalidateQueries({ queryKey: queryKeys.adminCategories.all(), refetchType: "all" })
        // Refetch ngay để đảm bảo data mới nhất
        await queryClient.refetchQueries({ queryKey: queryKeys.adminCategories.all(), type: "all" })
        
        // Gọi refresh để trigger table reload
        await runResourceRefresh({ refresh, resource: "categories" })
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : CATEGORY_MESSAGES.UNKNOWN_ERROR
        const errorTitles = {
          restore: CATEGORY_MESSAGES.BULK_RESTORE_ERROR,
          delete: CATEGORY_MESSAGES.BULK_DELETE_ERROR,
          "hard-delete": CATEGORY_MESSAGES.BULK_HARD_DELETE_ERROR,
        }
        showFeedback("error", errorTitles[action], `Không thể thực hiện thao tác cho ${ids.length} danh mục`, errorMessage)
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
    deletingCategories,
    restoringCategories,
    hardDeletingCategories,
    bulkState,
  }
}

