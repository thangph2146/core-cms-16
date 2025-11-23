/**
 * Custom hook để xử lý các actions của roles
 * Tách logic xử lý actions ra khỏi component chính để code sạch hơn
 */

import { useCallback, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/axios"
import { apiRoutes } from "@/lib/api/routes"
import { queryKeys } from "@/lib/query-keys"
import { useResourceBulkProcessing } from "@/features/admin/resources/hooks"
import type { ResourceRefreshHandler } from "@/features/admin/resources/types"
import { logger, resourceLogger, type ResourceAction } from "@/lib/config"
import type { RoleRow } from "../types"
import type { DataTableResult } from "@/components/tables"
import type { FeedbackVariant } from "@/components/dialogs"
import { ROLE_MESSAGES } from "../constants/messages"

interface UseRoleActionsOptions {
  canDelete: boolean
  canRestore: boolean
  canManage: boolean
  isSocketConnected: boolean
  showFeedback: (variant: FeedbackVariant, title: string, description?: string, details?: string) => void
}

export function useRoleActions({
  canDelete,
  canRestore,
  canManage,
  isSocketConnected,
  showFeedback,
}: UseRoleActionsOptions) {
  const queryClient = useQueryClient()
  const [togglingRoles, setTogglingRoles] = useState<Set<string>>(new Set())
  const [deletingRoles, setDeletingRoles] = useState<Set<string>>(new Set())
  const [restoringRoles, setRestoringRoles] = useState<Set<string>>(new Set())
  const [hardDeletingRoles, setHardDeletingRoles] = useState<Set<string>>(new Set())

  const { bulkState, startBulkProcessing, stopBulkProcessing } = useResourceBulkProcessing()

  const handleToggleStatus = useCallback(
    async (row: RoleRow, newStatus: boolean, refresh: ResourceRefreshHandler) => {
      if (!canManage) {
        showFeedback("error", ROLE_MESSAGES.NO_PERMISSION, ROLE_MESSAGES.NO_MANAGE_PERMISSION)
        return
      }

      // Prevent toggling super_admin
      if (row.name === "super_admin") {
        showFeedback("error", ROLE_MESSAGES.CANNOT_MODIFY_SUPER_ADMIN, ROLE_MESSAGES.CANNOT_MODIFY_SUPER_ADMIN)
        return
      }

      setTogglingRoles((prev) => new Set(prev).add(row.id))

      // Theo chuẩn Next.js 16: không update cache manually, chỉ invalidate
      // Socket events sẽ tự động update cache nếu có

      try {
        resourceLogger.actionFlow({
          resource: "roles",
          action: "toggle-status",
          step: "start",
          metadata: {
            roleId: row.id,
            roleName: row.displayName,
            newStatus,
          },
        })

        await apiClient.put(apiRoutes.roles.update(row.id), {
          isActive: newStatus,
        })

        resourceLogger.actionFlow({
          resource: "roles",
          action: "toggle-status",
          step: "success",
          metadata: {
            roleId: row.id,
            roleName: row.displayName,
            newStatus,
          },
        })

        showFeedback(
          "success",
          ROLE_MESSAGES.TOGGLE_ACTIVE_SUCCESS,
          `Đã ${newStatus ? "kích hoạt" : "vô hiệu hóa"} vai trò ${row.displayName}`
        )
        // Socket events sẽ tự động update cache, không cần manual refresh
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : ROLE_MESSAGES.UNKNOWN_ERROR
        
        resourceLogger.actionFlow({
          resource: "roles",
          action: "toggle-status",
          step: "error",
          metadata: {
            roleId: row.id,
            roleName: row.displayName,
            newStatus,
            error: errorMessage,
          },
        })

        showFeedback(
          "error",
          newStatus ? ROLE_MESSAGES.TOGGLE_ACTIVE_ERROR : ROLE_MESSAGES.TOGGLE_INACTIVE_ERROR,
          `Không thể ${newStatus ? "kích hoạt" : "vô hiệu hóa"} vai trò. Vui lòng thử lại.`,
          errorMessage
        )
        
        // Invalidate và refetch queries - Next.js 16 pattern: đảm bảo data fresh
        await queryClient.invalidateQueries({ queryKey: queryKeys.adminRoles.all(), refetchType: "active" })
        await queryClient.refetchQueries({ queryKey: queryKeys.adminRoles.all(), type: "active" })
      } finally {
        setTogglingRoles((prev) => {
          const next = new Set(prev)
          next.delete(row.id)
          return next
        })
      }
    },
    [canManage, isSocketConnected, showFeedback, queryClient],
  )

  const executeSingleAction = useCallback(
    async (
      action: "delete" | "restore" | "hard-delete",
      row: RoleRow,
      refresh: ResourceRefreshHandler
    ): Promise<void> => {
      const actionConfig = {
        delete: {
          permission: canDelete,
          endpoint: apiRoutes.roles.delete(row.id),
          method: "delete" as const,
          successTitle: ROLE_MESSAGES.DELETE_SUCCESS,
          successDescription: `Đã xóa vai trò ${row.displayName}`,
          errorTitle: ROLE_MESSAGES.DELETE_ERROR,
          errorDescription: `Không thể xóa vai trò ${row.displayName}`,
        },
        restore: {
          permission: canRestore,
          endpoint: apiRoutes.roles.restore(row.id),
          method: "post" as const,
          successTitle: ROLE_MESSAGES.RESTORE_SUCCESS,
          successDescription: `Đã khôi phục vai trò "${row.displayName}"`,
          errorTitle: ROLE_MESSAGES.RESTORE_ERROR,
          errorDescription: `Không thể khôi phục vai trò "${row.displayName}"`,
        },
        "hard-delete": {
          permission: canManage,
          endpoint: apiRoutes.roles.hardDelete(row.id),
          method: "delete" as const,
          successTitle: ROLE_MESSAGES.HARD_DELETE_SUCCESS,
          successDescription: `Đã xóa vĩnh viễn vai trò ${row.displayName}`,
          errorTitle: ROLE_MESSAGES.HARD_DELETE_ERROR,
          errorDescription: `Không thể xóa vĩnh viễn vai trò ${row.displayName}`,
        },
      }[action]

      if (!actionConfig.permission) return

      // Prevent actions on super_admin
      if (row.name === "super_admin") {
        const errorMsg = action === "hard-delete" 
          ? ROLE_MESSAGES.CANNOT_HARD_DELETE_SUPER_ADMIN
          : ROLE_MESSAGES.CANNOT_DELETE_SUPER_ADMIN
        showFeedback("error", errorMsg, errorMsg)
        return
      }

      // Track loading state
      const setLoadingState = action === "delete" 
        ? setDeletingRoles 
        : action === "restore" 
        ? setRestoringRoles 
        : setHardDeletingRoles

      setLoadingState((prev) => new Set(prev).add(row.id))

      try {
        resourceLogger.actionFlow({
          resource: "roles",
          action,
          step: "start",
          metadata: {
            roleId: row.id,
            roleName: row.displayName,
            socketConnected: isSocketConnected,
          },
        })

        if (actionConfig.method === "delete") {
          await apiClient.delete(actionConfig.endpoint)
        } else {
          await apiClient.post(actionConfig.endpoint)
        }

        resourceLogger.actionFlow({
          resource: "roles",
          action,
          step: "success",
          metadata: {
            roleId: row.id,
            roleName: row.displayName,
          },
        })

        showFeedback("success", actionConfig.successTitle, actionConfig.successDescription)
        
        // Invalidate và refetch queries - Next.js 16 pattern: đảm bảo data fresh
        // Đảm bảo table và detail luôn hiển thị data mới sau mutations
        await queryClient.invalidateQueries({ queryKey: queryKeys.adminRoles.all(), refetchType: "active" })
        await queryClient.refetchQueries({ queryKey: queryKeys.adminRoles.all(), type: "active" })
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : ROLE_MESSAGES.UNKNOWN_ERROR
        
        resourceLogger.actionFlow({
          resource: "roles",
          action,
          step: "error",
          metadata: {
            roleId: row.id,
            roleName: row.displayName,
            error: errorMessage,
          },
        })

        showFeedback("error", actionConfig.errorTitle, actionConfig.errorDescription, errorMessage)
        if (action === "restore") {
          logger.error(`Failed to ${action} role`, error as Error)
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
        resourceLogger.actionFlow({
          resource: "roles",
          action: `bulk-${action}` as ResourceAction,
          step: "start",
          metadata: {
            count: ids.length,
            ids: ids.slice(0, 5), // Log 5 IDs đầu
          },
        })

        const response = await apiClient.post<{ success: boolean; message: string; data?: { affected: number; message?: string } }>(apiRoutes.roles.bulk, { action, ids })

        // Xử lý response structure từ API
        const affected = response.data?.data?.affected ?? 0
        const apiMessage = response.data?.data?.message || response.data?.message

        // Nếu không có record nào được xử lý, hiển thị error feedback
        if (affected === 0) {
          const errorMessage = apiMessage || `Không có vai trò nào được ${action === "delete" ? "xóa" : action === "restore" ? "khôi phục" : "xóa vĩnh viễn"}`
          showFeedback("error", `Không thể ${action === "delete" ? "xóa" : action === "restore" ? "khôi phục" : "xóa vĩnh viễn"}`, errorMessage)
          return
        }

        const messages = {
          restore: { title: ROLE_MESSAGES.BULK_RESTORE_SUCCESS, description: apiMessage || `Đã khôi phục ${affected} vai trò` },
          delete: { title: ROLE_MESSAGES.BULK_DELETE_SUCCESS, description: apiMessage || `Đã xóa ${affected} vai trò` },
          "hard-delete": { title: ROLE_MESSAGES.BULK_HARD_DELETE_SUCCESS, description: apiMessage || `Đã xóa vĩnh viễn ${affected} vai trò` },
        }

        const message = messages[action]
        
        resourceLogger.actionFlow({
          resource: "roles",
          action: `bulk-${action}` as ResourceAction,
          step: "success",
          metadata: {
            count: ids.length,
            affected,
          },
        })

        showFeedback("success", message.title, message.description)
        clearSelection()

        // Invalidate và refetch queries - Next.js 16 pattern: đảm bảo data fresh
        // Đảm bảo table luôn hiển thị data mới sau bulk mutations
        await queryClient.invalidateQueries({ queryKey: queryKeys.adminRoles.all(), refetchType: "active" })
        await queryClient.refetchQueries({ queryKey: queryKeys.adminRoles.all(), type: "active" })
      } catch (error: unknown) {
        // Extract error message từ axios error response
        const axiosError = error as { response?: { data?: { message?: string; error?: string; data?: { message?: string } } } }
        const errorMessage = axiosError.response?.data?.message || axiosError.response?.data?.error || axiosError.response?.data?.data?.message || (error instanceof Error ? error.message : ROLE_MESSAGES.UNKNOWN_ERROR)
        
        const errorTitles = {
          restore: ROLE_MESSAGES.BULK_RESTORE_ERROR,
          delete: ROLE_MESSAGES.BULK_DELETE_ERROR,
          "hard-delete": ROLE_MESSAGES.BULK_HARD_DELETE_ERROR,
        }
        
        resourceLogger.actionFlow({
          resource: "roles",
          action: `bulk-${action}` as ResourceAction,
          step: "error",
          metadata: {
            count: ids.length,
            error: errorMessage,
          },
        })

        showFeedback("error", errorTitles[action], `Không thể thực hiện thao tác cho ${ids.length} vai trò`, errorMessage)
        
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
    handleToggleStatus,
    executeSingleAction,
    executeBulkAction,
    togglingRoles,
    deletingRoles,
    restoringRoles,
    hardDeletingRoles,
    bulkState,
  }
}

