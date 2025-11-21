/**
 * Custom hook để xử lý các actions của users
 * Tách logic xử lý actions ra khỏi component chính để code sạch hơn
 */

import { useCallback, useRef, useState } from "react"
import { apiClient } from "@/lib/api/axios"
import { apiRoutes } from "@/lib/api/routes"
import type { UserRow } from "../types"
import type { FeedbackVariant } from "@/components/dialogs"
import { USER_MESSAGES } from "../constants/messages"
import { logger } from "@/lib/config"

// Email của super admin không được phép xóa
const PROTECTED_SUPER_ADMIN_EMAIL = "superadmin@hub.edu.vn"

interface UseUserActionsOptions {
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

export function useUserActions({
  canDelete,
  canRestore,
  canManage,
  isSocketConnected,
  showFeedback,
}: UseUserActionsOptions) {
  const [isBulkProcessing, setIsBulkProcessing] = useState(false)
  const isBulkProcessingRef = useRef(false)
  const [deletingUsers, setDeletingUsers] = useState<Set<string>>(new Set())
  const [restoringUsers, setRestoringUsers] = useState<Set<string>>(new Set())
  const [hardDeletingUsers, setHardDeletingUsers] = useState<Set<string>>(new Set())
  const [togglingUsers, setTogglingUsers] = useState<Set<string>>(new Set())

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
      row: UserRow,
      refresh: () => void
    ): Promise<void> => {
      // Không cho phép xóa super admin
      if ((action === "delete" || action === "hard-delete") && row.email === PROTECTED_SUPER_ADMIN_EMAIL) {
        showFeedback("error", USER_MESSAGES.CANNOT_DELETE_SUPER_ADMIN, USER_MESSAGES.CANNOT_DELETE_SUPER_ADMIN)
        return
      }

      const actionConfig = {
        delete: {
          permission: canDelete,
          endpoint: apiRoutes.users.delete(row.id),
          method: "delete" as const,
          successTitle: USER_MESSAGES.DELETE_SUCCESS,
          successDescription: `Đã xóa người dùng ${row.email}`,
          errorTitle: USER_MESSAGES.DELETE_ERROR,
          errorDescription: `Không thể xóa người dùng ${row.email}`,
        },
        restore: {
          permission: canRestore,
          endpoint: apiRoutes.users.restore(row.id),
          method: "post" as const,
          successTitle: USER_MESSAGES.RESTORE_SUCCESS,
          successDescription: `Đã khôi phục người dùng "${row.email}"`,
          errorTitle: USER_MESSAGES.RESTORE_ERROR,
          errorDescription: `Không thể khôi phục người dùng "${row.email}"`,
        },
        "hard-delete": {
          permission: canManage,
          endpoint: apiRoutes.users.hardDelete(row.id),
          method: "delete" as const,
          successTitle: USER_MESSAGES.HARD_DELETE_SUCCESS,
          successDescription: `Đã xóa vĩnh viễn người dùng ${row.email}`,
          errorTitle: USER_MESSAGES.HARD_DELETE_ERROR,
          errorDescription: `Không thể xóa vĩnh viễn người dùng ${row.email}`,
        },
      }[action]

      if (!actionConfig.permission) return

      // Track loading state
      const setLoadingState = action === "delete" 
        ? setDeletingUsers 
        : action === "restore" 
        ? setRestoringUsers 
        : setHardDeletingUsers

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
        const errorMessage = error instanceof Error ? error.message : USER_MESSAGES.UNKNOWN_ERROR
        showFeedback("error", actionConfig.errorTitle, actionConfig.errorDescription, errorMessage)
        if (action === "restore") {
          logger.error(`Failed to ${action} user`, error as Error)
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

  const executeToggleActive = useCallback(
    async (row: UserRow, newStatus: boolean, refresh: () => void): Promise<void> => {
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
        if (!isSocketConnected) {
          refresh()
        }
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
    [canManage, isSocketConnected, showFeedback],
  )

  const executeBulkAction = useCallback(
    async (
      action: "delete" | "restore" | "hard-delete",
      ids: string[],
      rows: UserRow[],
      refresh: () => void,
      clearSelection: () => void
    ) => {
      if (ids.length === 0) return

      // Filter ra super admin từ danh sách đã chọn
      const deletableRows = rows.filter((row) => row.email !== PROTECTED_SUPER_ADMIN_EMAIL)
      const deletableIds = deletableRows.map((r) => r.id)
      const hasSuperAdmin = rows.some((row) => row.email === PROTECTED_SUPER_ADMIN_EMAIL)

      if (deletableIds.length === 0 && hasSuperAdmin) {
        showFeedback("error", USER_MESSAGES.CANNOT_DELETE_SUPER_ADMIN, USER_MESSAGES.CANNOT_DELETE_SUPER_ADMIN)
        return
      }

      if (!startBulkProcessing()) return

      try {
        await apiClient.post(apiRoutes.users.bulk, { action, ids: deletableIds })

        const messages = {
          restore: { title: USER_MESSAGES.BULK_RESTORE_SUCCESS, description: `Đã khôi phục ${deletableIds.length} người dùng` },
          delete: { title: USER_MESSAGES.BULK_DELETE_SUCCESS, description: `Đã xóa ${deletableIds.length} người dùng` },
          "hard-delete": { title: USER_MESSAGES.BULK_HARD_DELETE_SUCCESS, description: `Đã xóa vĩnh viễn ${deletableIds.length} người dùng` },
        }

        const message = messages[action]
        showFeedback("success", message.title, message.description)
        clearSelection()

        if (!isSocketConnected) {
          refresh()
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : USER_MESSAGES.UNKNOWN_ERROR
        const errorTitles = {
          restore: USER_MESSAGES.BULK_RESTORE_ERROR,
          delete: USER_MESSAGES.BULK_DELETE_ERROR,
          "hard-delete": USER_MESSAGES.BULK_HARD_DELETE_ERROR,
        }
        showFeedback("error", errorTitles[action], `Không thể thực hiện thao tác cho ${deletableIds.length} người dùng`, errorMessage)
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

