/**
 * Shared Hook for Resource Actions
 * 
 * Hook dùng chung để xử lý các actions (delete, restore, hard-delete) cho tất cả admin features
 * Sử dụng TanStack Query mutations với createAdminMutationOptions để đảm bảo không cache
 * Theo chuẩn Next.js 16: luôn fetch fresh data sau mutations
 */

import { useCallback, useState } from "react"
import { useQueryClient, useMutation } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/axios"
import { createAdminMutationOptions } from "../config"
import { useResourceBulkProcessing } from "./use-resource-bulk-processing"
import { runResourceRefresh } from "./resource-refresh"
import { resourceLogger } from "@/lib/config"
import type { ResourceRefreshHandler } from "../types"
import type { FeedbackVariant } from "@/components/dialogs"
import type { QueryKey } from "@tanstack/react-query"

export interface ResourceActionConfig<T extends { id: string }> {
  /**
   * Resource name để logging (ví dụ: "posts", "categories")
   */
  resourceName: string
  
  /**
   * Query keys cho resource này
   */
  queryKeys: {
    /**
     * Query key function để invalidate tất cả queries của resource
     */
    all: () => QueryKey
  }
  
  /**
   * API routes cho resource này
   */
  apiRoutes: {
    /**
     * Delete endpoint function
     */
    delete: (id: string) => string
    /**
     * Restore endpoint function
     */
    restore: (id: string) => string
    /**
     * Hard delete endpoint function
     */
    hardDelete: (id: string) => string
    /**
     * Bulk action endpoint
     */
    bulk: string
  }
  
  /**
   * Messages cho các actions
   */
  messages: {
    DELETE_SUCCESS: string
    DELETE_ERROR: string
    RESTORE_SUCCESS: string
    RESTORE_ERROR: string
    HARD_DELETE_SUCCESS: string
    HARD_DELETE_ERROR: string
    BULK_DELETE_SUCCESS: string
    BULK_DELETE_ERROR: string
    BULK_RESTORE_SUCCESS: string
    BULK_RESTORE_ERROR: string
    BULK_HARD_DELETE_SUCCESS: string
    BULK_HARD_DELETE_ERROR: string
    UNKNOWN_ERROR: string
  }
  
  /**
   * Function để lấy tên của record (dùng cho messages)
   */
  getRecordName: (row: T) => string
  
  /**
   * Permissions
   */
  permissions: {
    canDelete: boolean
    canRestore: boolean
    canManage: boolean
  }
  
  /**
   * Feedback handler
   */
  showFeedback: (variant: FeedbackVariant, title: string, description?: string, details?: string) => void
  
  /**
   * Socket connection status (optional)
   */
  isSocketConnected?: boolean
  
  /**
   * Custom metadata cho logging (optional)
   */
  getLogMetadata?: (row: T) => Record<string, unknown>
}

export interface UseResourceActionsResult<T extends { id: string }> {
  /**
   * Execute single action (delete, restore, hard-delete)
   */
  executeSingleAction: (
    action: "delete" | "restore" | "hard-delete",
    row: T,
    refresh: ResourceRefreshHandler
  ) => Promise<void>
  
  /**
   * Execute bulk action
   */
  executeBulkAction: (
    action: "delete" | "restore" | "hard-delete",
    ids: string[],
    refresh: ResourceRefreshHandler,
    clearSelection: () => void
  ) => Promise<void>
  
  /**
   * Loading states
   */
  deletingIds: Set<string>
  restoringIds: Set<string>
  hardDeletingIds: Set<string>
  
  /**
   * Bulk processing state
   */
  bulkState: ReturnType<typeof useResourceBulkProcessing>["bulkState"]
}

/**
 * Hook dùng chung để xử lý resource actions
 * 
 * @example
 * ```typescript
 * const actions = useResourceActions({
 *   resourceName: "posts",
 *   queryKeys: {
 *     all: () => queryKeys.adminPosts.all(),
 *   },
 *   apiRoutes: {
 *     delete: (id) => apiRoutes.posts.delete(id),
 *     restore: (id) => apiRoutes.posts.restore(id),
 *     hardDelete: (id) => apiRoutes.posts.hardDelete(id),
 *     bulk: apiRoutes.posts.bulk,
 *   },
 *   messages: POST_MESSAGES,
 *   getRecordName: (row) => row.title,
 *   permissions: {
 *     canDelete,
 *     canRestore,
 *     canManage,
 *   },
 *   showFeedback,
 * })
 * ```
 */
export function useResourceActions<T extends { id: string }>(
  config: ResourceActionConfig<T>
): UseResourceActionsResult<T> {
  const queryClient = useQueryClient()
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  const [restoringIds, setRestoringIds] = useState<Set<string>>(new Set())
  const [hardDeletingIds, setHardDeletingIds] = useState<Set<string>>(new Set())
  
  const { bulkState, startBulkProcessing, stopBulkProcessing } = useResourceBulkProcessing()
  
  // Single action mutation
  const singleActionMutation = useMutation(
    createAdminMutationOptions({
      mutationFn: async ({ action, row }: { action: "delete" | "restore" | "hard-delete"; row: T }) => {
        const endpoint = {
          delete: config.apiRoutes.delete(row.id),
          restore: config.apiRoutes.restore(row.id),
          "hard-delete": config.apiRoutes.hardDelete(row.id),
        }[action]
        
        const method = action === "delete" || action === "hard-delete" ? "delete" : "post"
        
        if (method === "delete") {
          return apiClient.delete(endpoint)
        } else {
          return apiClient.post(endpoint)
        }
      },
      onSuccess: async (_, variables) => {
        // Invalidate và refetch queries - Next.js 16 pattern: đảm bảo data fresh
        await queryClient.invalidateQueries({ 
          queryKey: config.queryKeys.all(), 
          refetchType: "active" 
        })
        await queryClient.refetchQueries({ 
          queryKey: config.queryKeys.all(), 
          type: "active" 
        })
        
        // Log success
        const actionType = variables.action === "delete" 
          ? "delete" 
          : variables.action === "restore" 
          ? "restore" 
          : "hard-delete"
        
        resourceLogger.actionFlow({
          resource: config.resourceName,
          action: actionType,
          step: "success",
          metadata: {
            resourceId: variables.row.id,
            recordName: config.getRecordName(variables.row),
            ...(config.getLogMetadata ? config.getLogMetadata(variables.row) : {}),
          },
        })
      },
      onError: (error, variables) => {
        const actionType = variables.action === "delete" 
          ? "delete" 
          : variables.action === "restore" 
          ? "restore" 
          : "hard-delete"
        
        const errorMessage = error instanceof Error ? error.message : config.messages.UNKNOWN_ERROR
        
        resourceLogger.actionFlow({
          resource: config.resourceName,
          action: actionType,
          step: "error",
          metadata: {
            resourceId: variables.row.id,
            recordName: config.getRecordName(variables.row),
            error: errorMessage,
            ...(config.getLogMetadata ? config.getLogMetadata(variables.row) : {}),
          },
        })
      },
    })
  )
  
  // Bulk action mutation
  const bulkActionMutation = useMutation(
    createAdminMutationOptions({
      mutationFn: async ({ action, ids }: { action: "delete" | "restore" | "hard-delete"; ids: string[] }) => {
        return apiClient.post(config.apiRoutes.bulk, { action, ids })
      },
      onSuccess: async (response, variables) => {
        const result = response.data?.data
        const affected = result?.affected ?? 0
        
        // Invalidate và refetch queries - Next.js 16 pattern: đảm bảo data fresh
        await queryClient.invalidateQueries({ 
          queryKey: config.queryKeys.all(), 
          refetchType: "active" 
        })
        await queryClient.refetchQueries({ 
          queryKey: config.queryKeys.all(), 
          type: "active" 
        })
        
        // Log success
        const actionType = variables.action === "delete" 
          ? "bulk-delete" 
          : variables.action === "restore" 
          ? "bulk-restore" 
          : "bulk-hard-delete"
        
        resourceLogger.actionFlow({
          resource: config.resourceName,
          action: actionType,
          step: "success",
          metadata: {
            requestedCount: variables.ids.length,
            affectedCount: affected,
          },
        })
      },
      onError: (error, variables) => {
        const actionType = variables.action === "delete" 
          ? "bulk-delete" 
          : variables.action === "restore" 
          ? "bulk-restore" 
          : "bulk-hard-delete"
        
        const errorMessage = error instanceof Error 
          ? error.message 
          : config.messages.UNKNOWN_ERROR
        
        resourceLogger.actionFlow({
          resource: config.resourceName,
          action: actionType,
          step: "error",
          metadata: {
            requestedCount: variables.ids.length,
            error: errorMessage,
            requestedIds: variables.ids,
          },
        })
      },
    })
  )
  
  const executeSingleAction = useCallback(
    async (
      action: "delete" | "restore" | "hard-delete",
      row: T,
      refresh: ResourceRefreshHandler
    ): Promise<void> => {
      const actionConfig = {
        delete: {
          permission: config.permissions.canDelete,
          successTitle: config.messages.DELETE_SUCCESS,
          successDescription: `Đã xóa ${config.getRecordName(row)}`,
          errorTitle: config.messages.DELETE_ERROR,
          errorDescription: `Không thể xóa ${config.getRecordName(row)}`,
        },
        restore: {
          permission: config.permissions.canRestore,
          successTitle: config.messages.RESTORE_SUCCESS,
          successDescription: `Đã khôi phục "${config.getRecordName(row)}"`,
          errorTitle: config.messages.RESTORE_ERROR,
          errorDescription: `Không thể khôi phục "${config.getRecordName(row)}"`,
        },
        "hard-delete": {
          permission: config.permissions.canManage,
          successTitle: config.messages.HARD_DELETE_SUCCESS,
          successDescription: `Đã xóa vĩnh viễn ${config.getRecordName(row)}`,
          errorTitle: config.messages.HARD_DELETE_ERROR,
          errorDescription: `Không thể xóa vĩnh viễn ${config.getRecordName(row)}`,
        },
      }[action]
      
      if (!actionConfig.permission) {
        resourceLogger.tableAction({
          resource: config.resourceName,
          action,
          resourceId: row.id,
          permissionDenied: true,
        })
        return
      }
      
      // Log action start
      resourceLogger.actionFlow({
        resource: config.resourceName,
        action,
        step: "start",
        metadata: {
          resourceId: row.id,
          recordName: config.getRecordName(row),
          socketConnected: config.isSocketConnected,
          ...(config.getLogMetadata ? config.getLogMetadata(row) : {}),
        },
      })
      
      // Track loading state
      const setLoadingState = action === "delete" 
        ? setDeletingIds 
        : action === "restore" 
        ? setRestoringIds 
        : setHardDeletingIds
      
      setLoadingState((prev) => new Set(prev).add(row.id))
      
      try {
        await singleActionMutation.mutateAsync({ action, row })
        
        config.showFeedback("success", actionConfig.successTitle, actionConfig.successDescription)
        
        // Socket events sẽ tự động update cache nếu có, nhưng vẫn cần invalidate để đảm bảo data fresh
        if (!config.isSocketConnected) {
          await runResourceRefresh({ refresh, resource: config.resourceName })
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : config.messages.UNKNOWN_ERROR
        config.showFeedback("error", actionConfig.errorTitle, actionConfig.errorDescription, errorMessage)
        
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
    [config, singleActionMutation]
  )
  
  const executeBulkAction = useCallback(
    async (
      action: "delete" | "restore" | "hard-delete",
      ids: string[],
      refresh: ResourceRefreshHandler,
      clearSelection: () => void
    ): Promise<void> => {
      if (ids.length === 0) return
      if (!startBulkProcessing()) return
      
      // Log action start
      resourceLogger.actionFlow({
        resource: config.resourceName,
        action: action === "delete" ? "bulk-delete" : action === "restore" ? "bulk-restore" : "bulk-hard-delete",
        step: "start",
        metadata: {
          count: ids.length,
          resourceIds: ids,
          socketConnected: config.isSocketConnected,
        },
      })
      
      try {
        const response = await bulkActionMutation.mutateAsync({ action, ids })
        
        const result = response.data?.data
        const affected = result?.affected ?? 0
        
        // Nếu không có record nào được xử lý (affected === 0), hiển thị thông báo
        if (affected === 0) {
          const actionText = action === "restore" ? "khôi phục" : action === "delete" ? "xóa" : "xóa vĩnh viễn"
          const errorMessage = result?.message || `Không có ${config.resourceName} nào được ${actionText}`
          config.showFeedback("error", "Không có thay đổi", errorMessage)
          clearSelection()
          
          resourceLogger.actionFlow({
            resource: config.resourceName,
            action: action === "delete" ? "bulk-delete" : action === "restore" ? "bulk-restore" : "bulk-hard-delete",
            step: "error",
            metadata: { 
              requestedCount: ids.length, 
              affectedCount: 0, 
              error: errorMessage, 
              requestedIds: ids 
            },
          })
          return
        }
        
        // Hiển thị success message với số lượng thực tế đã xử lý
        const messages = {
          restore: { 
            title: config.messages.BULK_RESTORE_SUCCESS, 
            description: result?.message || `Đã khôi phục ${affected} ${config.resourceName}` 
          },
          delete: { 
            title: config.messages.BULK_DELETE_SUCCESS, 
            description: result?.message || `Đã xóa ${affected} ${config.resourceName}` 
          },
          "hard-delete": { 
            title: config.messages.BULK_HARD_DELETE_SUCCESS, 
            description: result?.message || `Đã xóa vĩnh viễn ${affected} ${config.resourceName}` 
          },
        }
        
        const message = messages[action]
        config.showFeedback("success", message.title, message.description)
        clearSelection()
        
        // Socket events sẽ tự động update cache nếu có, nhưng vẫn cần invalidate để đảm bảo data fresh
        if (!config.isSocketConnected) {
          await runResourceRefresh({ refresh, resource: config.resourceName })
        }
      } catch (error: unknown) {
        // Extract error message từ response nếu có
        let errorMessage: string = config.messages.UNKNOWN_ERROR
        if (error && typeof error === "object" && "response" in error) {
          const axiosError = error as { response?: { data?: { message?: string; error?: string } } }
          errorMessage = axiosError.response?.data?.message || axiosError.response?.data?.error || config.messages.UNKNOWN_ERROR
        } else if (error instanceof Error) {
          errorMessage = error.message
        }
        
        const errorTitles = {
          restore: config.messages.BULK_RESTORE_ERROR,
          delete: config.messages.BULK_DELETE_ERROR,
          "hard-delete": config.messages.BULK_HARD_DELETE_ERROR,
        }
        config.showFeedback("error", errorTitles[action], `Không thể thực hiện thao tác cho ${ids.length} ${config.resourceName}`, errorMessage)
        
        if (action !== "restore") {
          throw error
        }
      } finally {
        stopBulkProcessing()
      }
    },
    [config, bulkActionMutation, startBulkProcessing, stopBulkProcessing]
  )
  
  return {
    executeSingleAction,
    executeBulkAction,
    deletingIds,
    restoringIds,
    hardDeletingIds,
    bulkState,
  }
}

