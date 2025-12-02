import { useCallback, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/axios"
import { apiRoutes } from "@/lib/api/routes"
import { queryKeys } from "@/lib/query-keys"
import { useResourceActions } from "@/features/admin/resources/hooks"
import type { ResourceRefreshHandler } from "@/features/admin/resources/types"
import type { ContactRequestRow } from "../types"
import type { FeedbackVariant } from "@/components/dialogs"
import { CONTACT_REQUEST_MESSAGES } from "../constants/messages"

interface UseContactRequestActionsOptions {
  canDelete: boolean
  canRestore: boolean
  canManage: boolean
  canUpdate: boolean
  isSocketConnected?: boolean
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

  const {
    executeSingleAction,
    executeBulkAction,
    deletingIds: deletingRequests,
    restoringIds: restoringRequests,
    hardDeletingIds: hardDeletingRequests,
    bulkState,
  } = useResourceActions<ContactRequestRow>({
    resourceName: "contact-requests",
    queryKeys: {
      all: () => queryKeys.adminContactRequests.all(),
    },
    apiRoutes: {
      delete: (id) => apiRoutes.contactRequests.delete(id),
      restore: (id) => apiRoutes.contactRequests.restore(id),
      hardDelete: (id) => apiRoutes.contactRequests.hardDelete(id),
      bulk: apiRoutes.contactRequests.bulk,
    },
    messages: CONTACT_REQUEST_MESSAGES,
    getRecordName: (row) => row.subject,
    permissions: {
      canDelete,
      canRestore,
      canManage,
    },
    showFeedback,
    isSocketConnected,
    getLogMetadata: (row) => ({
      contactRequestId: row.id,
      subject: row.subject,
      email: row.email,
    }),
  })

  // Giữ lại handleToggleRead riêng vì là logic đặc biệt
  const handleToggleRead = useCallback(
    async (row: ContactRequestRow, newStatus: boolean, _refresh: ResourceRefreshHandler) => {
      if (!canUpdate) {
        showFeedback("error", CONTACT_REQUEST_MESSAGES.NO_PERMISSION, CONTACT_REQUEST_MESSAGES.NO_UPDATE_PERMISSION)
        return
      }

      // Track loading state
      const setLoadingState = newStatus ? setMarkingReadRequests : setMarkingUnreadRequests
      setTogglingRequests((prev) => new Set(prev).add(row.id))
      setLoadingState((prev) => new Set(prev).add(row.id))

      try {
        await apiClient.put(apiRoutes.contactRequests.update(row.id), { isRead: newStatus })
        showFeedback(
          "success",
          newStatus ? CONTACT_REQUEST_MESSAGES.MARK_READ_SUCCESS : CONTACT_REQUEST_MESSAGES.MARK_UNREAD_SUCCESS,
          newStatus 
            ? `Yêu cầu liên hệ "${row.subject}" đã được đánh dấu là đã đọc.`
            : `Yêu cầu liên hệ "${row.subject}" đã được đánh dấu là chưa đọc.`
        )
        
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
    [canUpdate, showFeedback, queryClient],
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
