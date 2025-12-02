import { useCallback, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/axios"
import { apiRoutes } from "@/lib/api/routes"
import { queryKeys } from "@/lib/query-keys"
import { useResourceActions } from "@/features/admin/resources/hooks"
import type { ResourceRefreshHandler } from "@/features/admin/resources/types"
import { resourceLogger } from "@/lib/config"
import type { RoleRow } from "../types"
import type { FeedbackVariant } from "@/components/dialogs"
import { ROLE_MESSAGES } from "../constants/messages"

interface UseRoleActionsOptions {
  canDelete: boolean
  canRestore: boolean
  canManage: boolean
  isSocketConnected?: boolean
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

  const {
    executeSingleAction: baseExecuteSingleAction,
    executeBulkAction,
    deletingIds: deletingRoles,
    restoringIds: restoringRoles,
    hardDeletingIds: hardDeletingRoles,
    bulkState,
  } = useResourceActions<RoleRow>({
    resourceName: "roles",
    queryKeys: {
      all: () => queryKeys.adminRoles.all(),
    },
    apiRoutes: {
      delete: (id) => apiRoutes.roles.delete(id),
      restore: (id) => apiRoutes.roles.restore(id),
      hardDelete: (id) => apiRoutes.roles.hardDelete(id),
      bulk: apiRoutes.roles.bulk,
    },
    messages: ROLE_MESSAGES,
    getRecordName: (row) => row.displayName,
    permissions: {
      canDelete,
      canRestore,
      canManage,
    },
    showFeedback,
    isSocketConnected,
    getLogMetadata: (row) => ({
      roleId: row.id,
      roleName: row.displayName,
    }),
  })

  // Wrapper để thêm super_admin check
  const executeSingleAction = useCallback(
    async (
      action: "delete" | "restore" | "hard-delete",
      row: RoleRow,
      refresh: ResourceRefreshHandler
    ): Promise<void> => {
      // Prevent actions on super_admin
      if (row.name === "super_admin") {
        const errorMsg = action === "hard-delete" 
          ? ROLE_MESSAGES.CANNOT_HARD_DELETE_SUPER_ADMIN
          : ROLE_MESSAGES.CANNOT_DELETE_SUPER_ADMIN
        showFeedback("error", errorMsg, errorMsg)
        return
      }

      return baseExecuteSingleAction(action, row, refresh)
    },
    [baseExecuteSingleAction, showFeedback]
  )

  // Giữ lại handleToggleStatus riêng vì là logic đặc biệt
  const handleToggleStatus = useCallback(
    async (row: RoleRow, newStatus: boolean, _refresh: ResourceRefreshHandler) => {
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
        
        await queryClient.invalidateQueries({ queryKey: queryKeys.adminRoles.all(), refetchType: "active" })
        await queryClient.refetchQueries({ queryKey: queryKeys.adminRoles.all(), type: "active" })
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
      } finally {
        setTogglingRoles((prev) => {
          const next = new Set(prev)
          next.delete(row.id)
          return next
        })
      }
    },
    [canManage, showFeedback, queryClient],
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
