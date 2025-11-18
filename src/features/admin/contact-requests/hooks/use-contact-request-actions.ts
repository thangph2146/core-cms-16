/**
 * Custom hook để xử lý các actions của contact requests
 * Tách logic xử lý actions ra khỏi component chính để code sạch hơn
 */

import { useCallback, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/axios"
import { apiRoutes } from "@/lib/api/routes"
import { queryKeys } from "@/lib/query-keys"
import type { ContactRequestRow } from "../types"
import type { DataTableResult } from "@/components/tables"
import type { FeedbackVariant } from "@/components/dialogs"
import { CONTACT_REQUEST_MESSAGES } from "../constants/messages"

interface UseContactRequestActionsOptions {
  canDelete: boolean
  canRestore: boolean
  canManage: boolean
  canUpdate: boolean
  isSocketConnected: boolean
  showFeedback: (variant: FeedbackVariant, title: string, description?: string, details?: string) => void
}

interface BulkProcessingState {
  isProcessing: boolean
  ref: React.MutableRefObject<boolean>
}

export function useContactRequestActions({
  canDelete,
  canRestore,
  canManage,
  canUpdate,
  isSocketConnected,
  showFeedback,
}: UseContactRequestActionsOptions) {
  const queryClient = useQueryClient()
  const [isBulkProcessing, setIsBulkProcessing] = useState(false)
  const isBulkProcessingRef = useRef(false)
  const [togglingRequests, setTogglingRequests] = useState<Set<string>>(new Set())

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

  const handleToggleRead = useCallback(
    async (row: ContactRequestRow, newStatus: boolean, refresh: () => void) => {
      if (!canUpdate) {
        showFeedback("error", CONTACT_REQUEST_MESSAGES.NO_PERMISSION, CONTACT_REQUEST_MESSAGES.NO_UPDATE_PERMISSION)
        return
      }

      setTogglingRequests((prev) => new Set(prev).add(row.id))

      // Optimistic update chỉ khi không có socket (fallback)
      if (!isSocketConnected) {
        queryClient.setQueriesData<DataTableResult<ContactRequestRow>>(
          { queryKey: queryKeys.adminContactRequests.all() as unknown[] },
          (oldData) => {
            if (!oldData) return oldData
            const updatedRows = oldData.rows.map((r) =>
              r.id === row.id ? { ...r, isRead: newStatus } : r
            )
            return { ...oldData, rows: updatedRows }
          },
        )
      }

      try {
        await apiClient.put(apiRoutes.contactRequests.update(row.id), { isRead: newStatus })
        showFeedback(
          "success",
          newStatus ? CONTACT_REQUEST_MESSAGES.MARK_READ_SUCCESS : CONTACT_REQUEST_MESSAGES.MARK_UNREAD_SUCCESS,
          newStatus 
            ? `Yêu cầu liên hệ "${row.subject}" đã được đánh dấu là đã đọc.`
            : `Yêu cầu liên hệ "${row.subject}" đã được đánh dấu là chưa đọc.`
        )
        if (!isSocketConnected) {
          refresh()
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : CONTACT_REQUEST_MESSAGES.UNKNOWN_ERROR
        showFeedback(
          "error",
          newStatus ? CONTACT_REQUEST_MESSAGES.MARK_READ_ERROR : CONTACT_REQUEST_MESSAGES.MARK_UNREAD_ERROR,
          newStatus ? "Không thể đánh dấu đã đọc yêu cầu liên hệ." : "Không thể đánh dấu chưa đọc yêu cầu liên hệ.",
          errorMessage
        )
        
        // Rollback optimistic update nếu có lỗi
        if (isSocketConnected) {
          queryClient.invalidateQueries({ queryKey: queryKeys.adminContactRequests.all() })
        }
      } finally {
        setTogglingRequests((prev) => {
          const next = new Set(prev)
          next.delete(row.id)
          return next
        })
      }
    },
    [canUpdate, isSocketConnected, showFeedback, queryClient],
  )

  const executeSingleAction = useCallback(
    async (
      action: "delete" | "restore" | "hard-delete",
      row: ContactRequestRow,
      refresh: () => void
    ): Promise<void> => {
      const actionConfig = {
        delete: {
          permission: canDelete,
          endpoint: apiRoutes.contactRequests.delete(row.id),
          method: "delete" as const,
          successTitle: CONTACT_REQUEST_MESSAGES.DELETE_SUCCESS,
          successDescription: `Đã xóa yêu cầu liên hệ ${row.subject}`,
          errorTitle: CONTACT_REQUEST_MESSAGES.DELETE_ERROR,
          errorDescription: `Không thể xóa yêu cầu liên hệ ${row.subject}`,
        },
        restore: {
          permission: canRestore,
          endpoint: apiRoutes.contactRequests.restore(row.id),
          method: "post" as const,
          successTitle: CONTACT_REQUEST_MESSAGES.RESTORE_SUCCESS,
          successDescription: `Đã khôi phục yêu cầu liên hệ ${row.subject}`,
          errorTitle: CONTACT_REQUEST_MESSAGES.RESTORE_ERROR,
          errorDescription: `Không thể khôi phục yêu cầu liên hệ ${row.subject}`,
        },
        "hard-delete": {
          permission: canManage,
          endpoint: apiRoutes.contactRequests.hardDelete(row.id),
          method: "delete" as const,
          successTitle: CONTACT_REQUEST_MESSAGES.HARD_DELETE_SUCCESS,
          successDescription: `Đã xóa vĩnh viễn yêu cầu liên hệ ${row.subject}`,
          errorTitle: CONTACT_REQUEST_MESSAGES.HARD_DELETE_ERROR,
          errorDescription: `Không thể xóa vĩnh viễn yêu cầu liên hệ ${row.subject}`,
        },
      }[action]

      if (!actionConfig.permission) return

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
        const errorMessage = error instanceof Error ? error.message : CONTACT_REQUEST_MESSAGES.UNKNOWN_ERROR
        showFeedback("error", actionConfig.errorTitle, actionConfig.errorDescription, errorMessage)
        if (action === "restore") {
          console.error(`Failed to ${action} contact request`, error)
        } else {
          throw error
        }
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
        await apiClient.post(apiRoutes.contactRequests.bulk, { action, ids })

        const messages = {
          restore: { title: CONTACT_REQUEST_MESSAGES.BULK_RESTORE_SUCCESS, description: `Đã khôi phục ${ids.length} yêu cầu liên hệ` },
          delete: { title: CONTACT_REQUEST_MESSAGES.BULK_DELETE_SUCCESS, description: `Đã xóa ${ids.length} yêu cầu liên hệ` },
          "hard-delete": { title: CONTACT_REQUEST_MESSAGES.BULK_HARD_DELETE_SUCCESS, description: `Đã xóa vĩnh viễn ${ids.length} yêu cầu liên hệ` },
        }

        const message = messages[action]
        showFeedback("success", message.title, message.description)
        clearSelection()

        if (!isSocketConnected) {
          refresh()
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : CONTACT_REQUEST_MESSAGES.UNKNOWN_ERROR
        const errorTitles = {
          restore: CONTACT_REQUEST_MESSAGES.BULK_RESTORE_ERROR,
          delete: CONTACT_REQUEST_MESSAGES.BULK_DELETE_ERROR,
          "hard-delete": CONTACT_REQUEST_MESSAGES.BULK_HARD_DELETE_ERROR,
        }
        showFeedback("error", errorTitles[action], `Không thể thực hiện thao tác cho ${ids.length} yêu cầu liên hệ`, errorMessage)
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
    handleToggleRead,
    executeSingleAction,
    executeBulkAction,
    togglingRequests,
    bulkState,
  }
}

