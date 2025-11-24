/**
 * Custom hook để xử lý các actions của users
 * Sử dụng useResourceActions dùng chung cho delete/restore/hard-delete
 * Giữ lại executeToggleActive và super admin check riêng vì là logic đặc biệt
 */

import { useCallback, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/axios"
import { apiRoutes } from "@/lib/api/routes"
import { queryKeys } from "@/lib/query-keys"
import { useResourceActions } from "@/features/admin/resources/hooks"
import type { ResourceRefreshHandler } from "@/features/admin/resources/types"
import type { UserRow } from "../types"
import type { FeedbackVariant } from "@/components/dialogs"
import { USER_MESSAGES, PROTECTED_SUPER_ADMIN_EMAIL } from "../constants"

interface UseUserActionsOptions {
  canDelete: boolean
  canRestore: boolean
  canManage: boolean
  showFeedback: (variant: FeedbackVariant, title: string, description?: string, details?: string) => void
}

export function useUserActions({
  canDelete,
  canRestore,
  canManage,
  showFeedback,
}: UseUserActionsOptions) {
  const queryClient = useQueryClient()
  const [togglingUsers, setTogglingUsers] = useState<Set<string>>(new Set())

  // Sử dụng hook dùng chung cho delete/restore/hard-delete
  const {
    executeSingleAction: baseExecuteSingleAction,
    executeBulkAction: baseExecuteBulkAction,
    deletingIds: deletingUsers,
    restoringIds: restoringUsers,
    hardDeletingIds: hardDeletingUsers,
    bulkState,
  } = useResourceActions<UserRow>({
    resourceName: "users",
    queryKeys: {
      all: () => queryKeys.adminUsers.all(),
    },
    apiRoutes: {
      delete: (id) => apiRoutes.users.delete(id),
      restore: (id) => apiRoutes.users.restore(id),
      hardDelete: (id) => apiRoutes.users.hardDelete(id),
      bulk: apiRoutes.users.bulk,
    },
    messages: USER_MESSAGES,
    getRecordName: (row) => row.email,
    permissions: {
      canDelete,
      canRestore,
      canManage,
    },
    showFeedback,
    getLogMetadata: (row) => ({
      userId: row.id,
      userEmail: row.email,
    }),
  })

  // Wrapper để thêm super admin check
  const executeSingleAction = useCallback(
    async (
      action: "delete" | "restore" | "hard-delete",
      row: UserRow,
      _refresh: ResourceRefreshHandler
    ): Promise<void> => {
      // Không cho phép xóa super admin
      if ((action === "delete" || action === "hard-delete") && row.email === PROTECTED_SUPER_ADMIN_EMAIL) {
        showFeedback("error", USER_MESSAGES.CANNOT_DELETE_SUPER_ADMIN, USER_MESSAGES.CANNOT_DELETE_SUPER_ADMIN)
        return
      }

      return baseExecuteSingleAction(action, row, _refresh)
    },
    [baseExecuteSingleAction, showFeedback]
  )

  // Wrapper cho bulk action với super admin filter
  const executeBulkAction = useCallback(
    async (
      action: "delete" | "restore" | "hard-delete",
      ids: string[],
      rows: UserRow[],
      _refresh: ResourceRefreshHandler,
      clearSelection: () => void
    ) => {
      // Filter ra super admin từ danh sách đã chọn
      const deletableRows = rows.filter((row) => row.email !== PROTECTED_SUPER_ADMIN_EMAIL)
      const deletableIds = deletableRows.map((r) => r.id)
      const hasSuperAdmin = rows.some((row) => row.email === PROTECTED_SUPER_ADMIN_EMAIL)

      if (deletableIds.length === 0 && hasSuperAdmin) {
        showFeedback("error", USER_MESSAGES.CANNOT_DELETE_SUPER_ADMIN, USER_MESSAGES.CANNOT_DELETE_SUPER_ADMIN)
        return
      }

      // Gọi baseExecuteBulkAction với filtered IDs
      return baseExecuteBulkAction(action, deletableIds, _refresh, clearSelection)
    },
    [baseExecuteBulkAction, showFeedback]
  )

  // Giữ lại executeToggleActive riêng vì là logic đặc biệt
  const executeToggleActive = useCallback(
    async (row: UserRow, newStatus: boolean, _refresh: ResourceRefreshHandler): Promise<void> => {
      if (!canManage) {
        showFeedback("error", USER_MESSAGES.NO_PERMISSION, USER_MESSAGES.NO_MANAGE_PERMISSION)
        return
      }

      // Không cho phép vô hiệu hóa super admin
      if (row.email === PROTECTED_SUPER_ADMIN_EMAIL && newStatus === false) {
        showFeedback("error", USER_MESSAGES.CANNOT_DEACTIVATE_SUPER_ADMIN, USER_MESSAGES.CANNOT_DEACTIVATE_SUPER_ADMIN)
        return
      }

      setTogglingUsers((prev) => new Set(prev).add(row.id))

      try {
        await apiClient.put(apiRoutes.users.update(row.id), {
          isActive: newStatus,
        })

        showFeedback(
          "success",
          USER_MESSAGES.TOGGLE_ACTIVE_SUCCESS,
          `Đã ${newStatus ? "kích hoạt" : "vô hiệu hóa"} người dùng ${row.email}`
        )
        
        // Invalidate và refetch queries - Next.js 16 pattern: đảm bảo data fresh
        await queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers.all(), refetchType: "active" })
        await queryClient.refetchQueries({ queryKey: queryKeys.adminUsers.all(), type: "active" })
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : USER_MESSAGES.UNKNOWN_ERROR
        showFeedback(
          "error",
          USER_MESSAGES.TOGGLE_ACTIVE_ERROR,
          `Không thể ${newStatus ? "kích hoạt" : "vô hiệu hóa"} người dùng. Vui lòng thử lại.`,
          errorMessage
        )
      } finally {
        setTogglingUsers((prev) => {
          const next = new Set(prev)
          next.delete(row.id)
          return next
        })
      }
    },
    [canManage, showFeedback, queryClient],
  )

  return {
    executeSingleAction,
    executeToggleActive,
    executeBulkAction,
    deletingUsers,
    restoringUsers,
    hardDeletingUsers,
    togglingUsers,
    bulkState,
  }
}
