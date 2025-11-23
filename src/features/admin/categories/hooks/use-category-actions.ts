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
import type { DataTableResult } from "@/components/tables"
import type { FeedbackVariant } from "@/components/dialogs"
import { CATEGORY_MESSAGES } from "../constants/messages"
import { logger, resourceLogger } from "@/lib/config"

interface UseCategoryActionsOptions {
  canDelete: boolean
  canRestore: boolean
  canManage: boolean
  isSocketConnected: boolean
  showFeedback: (variant: FeedbackVariant, title: string, description?: string, details?: string) => void
}

export function useCategoryActions({
  canDelete,
  canRestore,
  canManage,
  isSocketConnected,
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

      if (!actionConfig.permission) {
        resourceLogger.tableAction({
          resource: "categories",
          action,
          resourceId: row.id,
          permissionDenied: true,
        })
        return
      }

      resourceLogger.actionFlow({
        resource: "categories",
        action,
        step: "start",
        metadata: {
          categoryId: row.id,
          categoryName: row.name,
          socketConnected: isSocketConnected,
        },
      })

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
        
        resourceLogger.actionFlow({
          resource: "categories",
          action,
          step: "success",
          metadata: {
            categoryId: row.id,
            categoryName: row.name,
          },
        })

        showFeedback("success", actionConfig.successTitle, actionConfig.successDescription)
        
        // Invalidate và refetch queries - Next.js 16 pattern: đảm bảo data fresh
        // Đảm bảo table và detail luôn hiển thị data mới sau mutations
        await queryClient.invalidateQueries({ queryKey: queryKeys.adminCategories.all(), refetchType: "active" })
        await queryClient.refetchQueries({ queryKey: queryKeys.adminCategories.all(), type: "active" })
        
        // Socket events sẽ tự động update cache nếu có, nhưng vẫn cần invalidate để đảm bảo data fresh
        if (!isSocketConnected) {
          await runResourceRefresh({ refresh, resource: "categories" })
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : CATEGORY_MESSAGES.UNKNOWN_ERROR
        
        resourceLogger.actionFlow({
          resource: "categories",
          action,
          step: "error",
          metadata: {
            categoryId: row.id,
            categoryName: row.name,
            error: errorMessage,
          },
        })

        showFeedback("error", actionConfig.errorTitle, actionConfig.errorDescription, errorMessage)
        if (action === "restore") {
          // Don't throw for restore to allow UI to continue
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
        resource: "categories",
        action: action === "delete" ? "bulk-delete" : action === "restore" ? "bulk-restore" : "bulk-hard-delete",
        step: "start",
        metadata: {
          count: ids.length,
          categoryIds: ids,
          socketConnected: isSocketConnected,
        },
      })

      try {
        const response = await apiClient.post(apiRoutes.categories.bulk, { action, ids })

        const result = response.data?.data
        const affected = result?.affected ?? 0

        // Nếu không có category nào được xử lý (affected === 0), hiển thị thông báo
        if (affected === 0) {
          const actionText = action === "restore" ? "khôi phục" : action === "delete" ? "xóa" : "xóa vĩnh viễn"
          const errorMessage = result?.message || `Không có danh mục nào được ${actionText}`
          showFeedback("error", "Không có thay đổi", errorMessage)
          clearSelection()
          resourceLogger.actionFlow({
            resource: "categories",
            action: action === "delete" ? "bulk-delete" : action === "restore" ? "bulk-restore" : "bulk-hard-delete",
            step: "error",
            metadata: { requestedCount: ids.length, affectedCount: 0, error: errorMessage, requestedIds: ids },
          })
          return
        }

        // Hiển thị success message với số lượng thực tế đã xử lý
        const messages = {
          restore: { title: CATEGORY_MESSAGES.BULK_RESTORE_SUCCESS, description: result?.message || `Đã khôi phục ${affected} danh mục` },
          delete: { title: CATEGORY_MESSAGES.BULK_DELETE_SUCCESS, description: result?.message || `Đã xóa ${affected} danh mục` },
          "hard-delete": { title: CATEGORY_MESSAGES.BULK_HARD_DELETE_SUCCESS, description: result?.message || `Đã xóa vĩnh viễn ${affected} danh mục` },
        }

        const message = messages[action]
        showFeedback("success", message.title, message.description)
        clearSelection()

        resourceLogger.actionFlow({
          resource: "categories",
          action: action === "delete" ? "bulk-delete" : action === "restore" ? "bulk-restore" : "bulk-hard-delete",
          step: "success",
          metadata: { requestedCount: ids.length, affectedCount: affected },
        })

        // Invalidate và refetch queries - Next.js 16 pattern: đảm bảo data fresh
        // Đảm bảo table luôn hiển thị data mới sau bulk mutations
        await queryClient.invalidateQueries({ queryKey: queryKeys.adminCategories.all(), refetchType: "active" })
        await queryClient.refetchQueries({ queryKey: queryKeys.adminCategories.all(), type: "active" })
        
        // Socket events sẽ tự động update cache nếu có, nhưng vẫn cần invalidate để đảm bảo data fresh
        if (!isSocketConnected) {
          await runResourceRefresh({ refresh, resource: "categories" })
        }
      } catch (error: unknown) {
        // Extract error message từ response nếu có
        let errorMessage: string = CATEGORY_MESSAGES.UNKNOWN_ERROR
        if (error && typeof error === "object" && "response" in error) {
          const axiosError = error as { response?: { data?: { message?: string; error?: string } } }
          errorMessage = axiosError.response?.data?.message || axiosError.response?.data?.error || CATEGORY_MESSAGES.UNKNOWN_ERROR
        } else if (error instanceof Error) {
          errorMessage = error.message
        }
        
        resourceLogger.actionFlow({
          resource: "categories",
          action: action === "delete" ? "bulk-delete" : action === "restore" ? "bulk-restore" : "bulk-hard-delete",
          step: "error",
          metadata: {
            count: ids.length,
            categoryIds: ids,
            error: errorMessage,
          },
        })

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
    [showFeedback, startBulkProcessing, stopBulkProcessing, isSocketConnected, queryClient],
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

