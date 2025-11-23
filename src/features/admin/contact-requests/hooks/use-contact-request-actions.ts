/**
 * Custom hook để xử lý các actions của contact requests
 * Tách logic xử lý actions ra khỏi component chính để code sạch hơn
 */

import { useCallback, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/axios"
import { apiRoutes } from "@/lib/api/routes"
import { queryKeys } from "@/lib/query-keys"
import { useResourceBulkProcessing } from "@/features/admin/resources/hooks"
import type { ResourceRefreshHandler } from "@/features/admin/resources/types"
import type { ContactRequestRow } from "../types"
import type { DataTableResult } from "@/components/tables"
import type { FeedbackVariant } from "@/components/dialogs"
import { CONTACT_REQUEST_MESSAGES } from "../constants/messages"
import { logger } from "@/lib/config"

interface UseContactRequestActionsOptions {
  canDelete: boolean
  canRestore: boolean
  canManage: boolean
  canUpdate: boolean
  isSocketConnected: boolean
  showFeedback: (variant: FeedbackVariant, title: string, description?: string, details?: string) => void
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
  const [markingReadRequests, setMarkingReadRequests] = useState<Set<string>>(new Set())
  const [markingUnreadRequests, setMarkingUnreadRequests] = useState<Set<string>>(new Set())
  const [togglingRequests, setTogglingRequests] = useState<Set<string>>(new Set())
  const [deletingRequests, setDeletingRequests] = useState<Set<string>>(new Set())
  const [restoringRequests, setRestoringRequests] = useState<Set<string>>(new Set())
  const [hardDeletingRequests, setHardDeletingRequests] = useState<Set<string>>(new Set())

  const { bulkState, startBulkProcessing, stopBulkProcessing } = useResourceBulkProcessing()

  const handleToggleRead = useCallback(
    async (row: ContactRequestRow, newStatus: boolean, refresh: ResourceRefreshHandler) => {
      if (!canUpdate) {
        showFeedback("error", CONTACT_REQUEST_MESSAGES.NO_PERMISSION, CONTACT_REQUEST_MESSAGES.NO_UPDATE_PERMISSION)
        return
      }

      // Track loading state
      const setLoadingState = newStatus ? setMarkingReadRequests : setMarkingUnreadRequests
      setTogglingRequests((prev) => new Set(prev).add(row.id))
      setLoadingState((prev) => new Set(prev).add(row.id))

      // Theo chuẩn Next.js 16: không update cache manually, chỉ invalidate
      // Socket events sẽ tự động update cache nếu có

      try {
        await apiClient.put(apiRoutes.contactRequests.update(row.id), { isRead: newStatus })
        showFeedback(
          "success",
          newStatus ? CONTACT_REQUEST_MESSAGES.MARK_READ_SUCCESS : CONTACT_REQUEST_MESSAGES.MARK_UNREAD_SUCCESS,
          newStatus 
            ? `Yêu cầu liên hệ "${row.subject}" đã được đánh dấu là đã đọc.`
            : `Yêu cầu liên hệ "${row.subject}" đã được đánh dấu là chưa đọc.`
        )
        
        // Invalidate và refetch queries - Next.js 16 pattern: đảm bảo data fresh
        await queryClient.invalidateQueries({ queryKey: queryKeys.adminContactRequests.all(), refetchType: "active" })
        await queryClient.refetchQueries({ queryKey: queryKeys.adminContactRequests.all(), type: "active" })
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : CONTACT_REQUEST_MESSAGES.UNKNOWN_ERROR
        showFeedback(
          "error",
          newStatus ? CONTACT_REQUEST_MESSAGES.MARK_READ_ERROR : CONTACT_REQUEST_MESSAGES.MARK_UNREAD_ERROR,
          newStatus ? "Không thể đánh dấu đã đọc yêu cầu liên hệ." : "Không thể đánh dấu chưa đọc yêu cầu liên hệ.",
          errorMessage
        )
        
        // Invalidate và refetch queries - Next.js 16 pattern: đảm bảo data fresh
        await queryClient.invalidateQueries({ queryKey: queryKeys.adminContactRequests.all(), refetchType: "active" })
        await queryClient.refetchQueries({ queryKey: queryKeys.adminContactRequests.all(), type: "active" })
      } finally {
        setTogglingRequests((prev) => {
          const next = new Set(prev)
          next.delete(row.id)
          return next
        })
        setLoadingState((prev) => {
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
      refresh: ResourceRefreshHandler
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

      // Track loading state
      const setLoadingState = action === "delete"
        ? setDeletingRequests
        : action === "restore"
        ? setRestoringRequests
        : setHardDeletingRequests

      setLoadingState((prev) => new Set(prev).add(row.id))

      try {
        if (actionConfig.method === "delete") {
          await apiClient.delete(actionConfig.endpoint)
        } else {
          await apiClient.post(actionConfig.endpoint)
        }
        showFeedback("success", actionConfig.successTitle, actionConfig.successDescription)
        
        // Invalidate và refetch queries - Next.js 16 pattern: đảm bảo data fresh
        // Đảm bảo table và detail luôn hiển thị data mới sau mutations
        await queryClient.invalidateQueries({ queryKey: queryKeys.adminContactRequests.all(), refetchType: "active" })
        await queryClient.refetchQueries({ queryKey: queryKeys.adminContactRequests.all(), type: "active" })
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : CONTACT_REQUEST_MESSAGES.UNKNOWN_ERROR
        showFeedback("error", actionConfig.errorTitle, actionConfig.errorDescription, errorMessage)
        if (action === "restore") {
          logger.error(`Failed to ${action} contact request`, error as Error)
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
        await apiClient.post(apiRoutes.contactRequests.bulk, { action, ids })

        const messages = {
          restore: { title: CONTACT_REQUEST_MESSAGES.BULK_RESTORE_SUCCESS, description: `Đã khôi phục ${ids.length} yêu cầu liên hệ` },
          delete: { title: CONTACT_REQUEST_MESSAGES.BULK_DELETE_SUCCESS, description: `Đã xóa ${ids.length} yêu cầu liên hệ` },
          "hard-delete": { title: CONTACT_REQUEST_MESSAGES.BULK_HARD_DELETE_SUCCESS, description: `Đã xóa vĩnh viễn ${ids.length} yêu cầu liên hệ` },
        }

        const message = messages[action]
        showFeedback("success", message.title, message.description)
        clearSelection()

        // Invalidate và refetch queries - Next.js 16 pattern: đảm bảo data fresh
        // Đảm bảo table luôn hiển thị data mới sau bulk mutations
        await queryClient.invalidateQueries({ queryKey: queryKeys.adminContactRequests.all(), refetchType: "active" })
        await queryClient.refetchQueries({ queryKey: queryKeys.adminContactRequests.all(), type: "active" })
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
    [showFeedback, startBulkProcessing, stopBulkProcessing],
  )

  return {
    handleToggleRead,
    executeSingleAction,
    executeBulkAction,
    markingReadRequests,
    markingUnreadRequests,
    togglingRequests,
    deletingRequests,
    restoringRequests,
    hardDeletingRequests,
    bulkState,
  }
}

