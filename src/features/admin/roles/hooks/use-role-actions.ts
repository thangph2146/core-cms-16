/**
 * Custom hook để xử lý các actions của roles
 * Tách logic xử lý actions ra khỏi component chính để code sạch hơn
 */

import { useCallback, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/axios"
import { apiRoutes } from "@/lib/api/routes"
import { queryKeys } from "@/lib/query-keys"
import { logger } from "@/lib/config"
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

interface BulkProcessingState {
  isProcessing: boolean
  ref: React.MutableRefObject<boolean>
}

export function useRoleActions({
  canDelete,
  canRestore,
  canManage,
  isSocketConnected,
  showFeedback,
}: UseRoleActionsOptions) {
  const queryClient = useQueryClient()
  const [isBulkProcessing, setIsBulkProcessing] = useState(false)
  const isBulkProcessingRef = useRef(false)
  const [togglingRoles, setTogglingRoles] = useState<Set<string>>(new Set())
  const [deletingRoles, setDeletingRoles] = useState<Set<string>>(new Set())
  const [restoringRoles, setRestoringRoles] = useState<Set<string>>(new Set())
  const [hardDeletingRoles, setHardDeletingRoles] = useState<Set<string>>(new Set())

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

  const handleToggleStatus = useCallback(
    async (row: RoleRow, newStatus: boolean, refresh: () => void) => {
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

      // Optimistic update chỉ khi không có socket (fallback)
      if (!isSocketConnected) {
        queryClient.setQueriesData<DataTableResult<RoleRow>>(
          { queryKey: queryKeys.adminRoles.all() as unknown[] },
          (oldData) => {
            if (!oldData) return oldData
            const updatedRows = oldData.rows.map((r) =>
              r.id === row.id ? { ...r, isActive: newStatus } : r
            )
            return { ...oldData, rows: updatedRows }
          },
        )
      }

      try {
        await apiClient.put(apiRoutes.roles.update(row.id), {
          isActive: newStatus,
        })

        showFeedback(
          "success",
          ROLE_MESSAGES.TOGGLE_ACTIVE_SUCCESS,
          `Đã ${newStatus ? "kích hoạt" : "vô hiệu hóa"} vai trò ${row.displayName}`
        )
        if (!isSocketConnected) {
          refresh()
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : ROLE_MESSAGES.UNKNOWN_ERROR
        showFeedback(
          "error",
          newStatus ? ROLE_MESSAGES.TOGGLE_ACTIVE_ERROR : ROLE_MESSAGES.TOGGLE_INACTIVE_ERROR,
          `Không thể ${newStatus ? "kích hoạt" : "vô hiệu hóa"} vai trò. Vui lòng thử lại.`,
          errorMessage
        )
        
        // Rollback optimistic update nếu có lỗi
        if (!isSocketConnected) {
          queryClient.invalidateQueries({ queryKey: queryKeys.adminRoles.all() })
        }
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
      refresh: () => void
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
        const errorMessage = error instanceof Error ? error.message : ROLE_MESSAGES.UNKNOWN_ERROR
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
        await apiClient.post(apiRoutes.roles.bulk, { action, ids })

        const messages = {
          restore: { title: ROLE_MESSAGES.BULK_RESTORE_SUCCESS, description: `Đã khôi phục ${ids.length} vai trò` },
          delete: { title: ROLE_MESSAGES.BULK_DELETE_SUCCESS, description: `Đã xóa ${ids.length} vai trò` },
          "hard-delete": { title: ROLE_MESSAGES.BULK_HARD_DELETE_SUCCESS, description: `Đã xóa vĩnh viễn ${ids.length} vai trò` },
        }

        const message = messages[action]
        showFeedback("success", message.title, message.description)
        clearSelection()

        if (!isSocketConnected) {
          refresh()
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : ROLE_MESSAGES.UNKNOWN_ERROR
        const errorTitles = {
          restore: ROLE_MESSAGES.BULK_RESTORE_ERROR,
          delete: ROLE_MESSAGES.BULK_DELETE_ERROR,
          "hard-delete": ROLE_MESSAGES.BULK_HARD_DELETE_ERROR,
        }
        showFeedback("error", errorTitles[action], `Không thể thực hiện thao tác cho ${ids.length} vai trò`, errorMessage)
        if (action !== "restore") {
          throw error
        }
      } finally {
        stopBulkProcessing()
      }
    },
    [isSocketConnected, showFeedback, startBulkProcessing, stopBulkProcessing],
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

