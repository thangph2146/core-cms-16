/**
 * Custom hook để xử lý các actions của sessions
 * Tách logic xử lý actions ra khỏi component chính để code sạch hơn
 */

import { useCallback, useRef, useState } from "react"
import { apiClient } from "@/lib/api/axios"
import { apiRoutes } from "@/lib/api/routes"
import type { SessionRow } from "../types"
import type { FeedbackVariant } from "@/components/dialogs"
import { SESSION_MESSAGES } from "../constants/messages"
import { logger } from "@/lib/config"

interface UseSessionActionsOptions {
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

export function useSessionActions({
  canDelete,
  canRestore,
  canManage,
  isSocketConnected,
  showFeedback,
}: UseSessionActionsOptions) {
  const [isBulkProcessing, setIsBulkProcessing] = useState(false)
  const isBulkProcessingRef = useRef(false)
  const [deletingSessions, setDeletingSessions] = useState<Set<string>>(new Set())
  const [restoringSessions, setRestoringSessions] = useState<Set<string>>(new Set())
  const [hardDeletingSessions, setHardDeletingSessions] = useState<Set<string>>(new Set())
  const [togglingSessions, setTogglingSessions] = useState<Set<string>>(new Set())

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
    async (row: SessionRow, newStatus: boolean, refresh: () => void) => {
      if (!canManage) {
        showFeedback("error", SESSION_MESSAGES.NO_PERMISSION, SESSION_MESSAGES.NO_MANAGE_PERMISSION)
        return
      }

      setTogglingSessions((prev) => new Set(prev).add(row.id))

      try {
        await apiClient.put(apiRoutes.sessions.update(row.id), {
          isActive: newStatus,
        })

        showFeedback(
          "success",
          newStatus ? SESSION_MESSAGES.TOGGLE_ACTIVE_SUCCESS : SESSION_MESSAGES.TOGGLE_INACTIVE_SUCCESS,
          `Đã ${newStatus ? "kích hoạt" : "vô hiệu hóa"} session của ${row.userName || row.userEmail || "người dùng"}`
        )
        if (!isSocketConnected) {
          refresh()
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : SESSION_MESSAGES.UNKNOWN_ERROR
        showFeedback(
          "error",
          newStatus ? SESSION_MESSAGES.TOGGLE_ACTIVE_ERROR : SESSION_MESSAGES.TOGGLE_INACTIVE_ERROR,
          `Không thể ${newStatus ? "kích hoạt" : "vô hiệu hóa"} session. Vui lòng thử lại.`,
          errorMessage
        )
      } finally {
        setTogglingSessions((prev) => {
          const next = new Set(prev)
          next.delete(row.id)
          return next
        })
      }
    },
    [canManage, isSocketConnected, showFeedback],
  )

  const executeSingleAction = useCallback(
    async (
      action: "delete" | "restore" | "hard-delete",
      row: SessionRow,
      refresh: () => void
    ): Promise<void> => {
      const actionConfig = {
        delete: {
          permission: canDelete,
          endpoint: apiRoutes.sessions.delete(row.id),
          method: "delete" as const,
          successTitle: SESSION_MESSAGES.DELETE_SUCCESS,
          successDescription: `Đã xóa session của ${row.userName || row.userEmail || "người dùng"}`,
          errorTitle: SESSION_MESSAGES.DELETE_ERROR,
          errorDescription: `Không thể xóa session của ${row.userName || row.userEmail || "người dùng"}`,
        },
        restore: {
          permission: canRestore,
          endpoint: apiRoutes.sessions.restore(row.id),
          method: "post" as const,
          successTitle: SESSION_MESSAGES.RESTORE_SUCCESS,
          successDescription: `Đã khôi phục session của ${row.userName || row.userEmail || "người dùng"}`,
          errorTitle: SESSION_MESSAGES.RESTORE_ERROR,
          errorDescription: `Không thể khôi phục session của ${row.userName || row.userEmail || "người dùng"}`,
        },
        "hard-delete": {
          permission: canManage,
          endpoint: apiRoutes.sessions.hardDelete(row.id),
          method: "delete" as const,
          successTitle: SESSION_MESSAGES.HARD_DELETE_SUCCESS,
          successDescription: `Đã xóa vĩnh viễn session của ${row.userName || row.userEmail || "người dùng"}`,
          errorTitle: SESSION_MESSAGES.HARD_DELETE_ERROR,
          errorDescription: `Không thể xóa vĩnh viễn session của ${row.userName || row.userEmail || "người dùng"}`,
        },
      }[action]

      if (!actionConfig.permission) return

      // Track loading state
      const setLoadingState = action === "delete" 
        ? setDeletingSessions 
        : action === "restore" 
        ? setRestoringSessions 
        : setHardDeletingSessions

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
        const errorMessage = error instanceof Error ? error.message : SESSION_MESSAGES.UNKNOWN_ERROR
        showFeedback("error", actionConfig.errorTitle, actionConfig.errorDescription, errorMessage)
        if (action === "restore") {
          logger.error(`Failed to ${action} session`, error as Error)
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
        await apiClient.post(apiRoutes.sessions.bulk, { action, ids })

        const messages = {
          restore: { title: SESSION_MESSAGES.BULK_RESTORE_SUCCESS, description: `Đã khôi phục ${ids.length} session` },
          delete: { title: SESSION_MESSAGES.BULK_DELETE_SUCCESS, description: `Đã xóa ${ids.length} session` },
          "hard-delete": { title: SESSION_MESSAGES.BULK_HARD_DELETE_SUCCESS, description: `Đã xóa vĩnh viễn ${ids.length} session` },
        }

        const message = messages[action]
        showFeedback("success", message.title, message.description)
        clearSelection()

        if (!isSocketConnected) {
          refresh()
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : SESSION_MESSAGES.UNKNOWN_ERROR
        const errorTitles = {
          restore: SESSION_MESSAGES.BULK_RESTORE_ERROR,
          delete: SESSION_MESSAGES.BULK_DELETE_ERROR,
          "hard-delete": SESSION_MESSAGES.BULK_HARD_DELETE_ERROR,
        }
        showFeedback("error", errorTitles[action], `Không thể thực hiện thao tác cho ${ids.length} session`, errorMessage)
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
    deletingSessions,
    restoringSessions,
    hardDeletingSessions,
    togglingSessions,
    bulkState,
  }
}

