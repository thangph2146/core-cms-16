import { useCallback, useState } from "react"
import { useSession } from "next-auth/react"
import { apiClient } from "@/lib/api/axios"
import { apiRoutes } from "@/lib/api/routes"
import { useDeleteNotification } from "@/hooks/use-notifications"
import { useResourceBulkProcessing } from "@/features/admin/resources/hooks"
import type { FeedbackVariant } from "@/components/dialogs"
import type { NotificationRow } from "../types"
import { NOTIFICATION_MESSAGES } from "../constants"

interface ApiError {
  response?: {
    data?: {
      message?: string
    }
  }
}

function getErrorMessage(error: unknown, defaultMessage: string): string {
  return (error as ApiError)?.response?.data?.message || defaultMessage
}

interface UseNotificationActionsOptions {
  showFeedback: (variant: FeedbackVariant, title: string, description?: string, details?: string) => void
  triggerTableRefresh: () => void
}

export function useNotificationActions({
  showFeedback,
  triggerTableRefresh,
}: UseNotificationActionsOptions) {
  const { data: session } = useSession()
  const deleteNotificationMutation = useDeleteNotification()
  const [togglingNotifications, setTogglingNotifications] = useState<Set<string>>(new Set())
  const [markingReadNotifications, setMarkingReadNotifications] = useState<Set<string>>(new Set())
  const [markingUnreadNotifications, setMarkingUnreadNotifications] = useState<Set<string>>(new Set())
  const [deletingNotifications, setDeletingNotifications] = useState<Set<string>>(new Set())

  const { bulkState, startBulkProcessing, stopBulkProcessing } = useResourceBulkProcessing()

  const handleToggleRead = useCallback(
    async (row: NotificationRow, newStatus: boolean, refresh: () => void) => {
      const isOwner = session?.user?.id === row.userId
      
      if (!isOwner) {
        showFeedback("error", NOTIFICATION_MESSAGES.NO_PERMISSION, NOTIFICATION_MESSAGES.NO_OWNER_PERMISSION)
        return
      }

      // Track loading state
      const setLoadingState = newStatus ? setMarkingReadNotifications : setMarkingUnreadNotifications
      const updateLoadingState = (prev: Set<string>) => new Set(prev).add(row.id)
      setTogglingNotifications(updateLoadingState)
      setLoadingState(updateLoadingState)

      try {
        await apiClient.patch(apiRoutes.notifications.markRead(row.id), { isRead: newStatus })
        showFeedback(
          "success",
          newStatus ? NOTIFICATION_MESSAGES.MARK_READ_SUCCESS : NOTIFICATION_MESSAGES.MARK_UNREAD_SUCCESS,
          newStatus 
            ? "Thông báo đã được đánh dấu là đã đọc."
            : "Thông báo đã được đánh dấu là chưa đọc."
        )
        refresh()
      } catch (error: unknown) {
        const defaultMessage = newStatus
          ? "Không thể đánh dấu đã đọc thông báo."
          : "Không thể đánh dấu chưa đọc thông báo."
        const errorMessage = getErrorMessage(error, defaultMessage)
        showFeedback(
          "error",
          newStatus ? NOTIFICATION_MESSAGES.MARK_READ_ERROR : NOTIFICATION_MESSAGES.MARK_UNREAD_ERROR,
          errorMessage
        )
      } finally {
        const removeFromSet = (prev: Set<string>) => {
          const next = new Set(prev)
          next.delete(row.id)
          return next
        }
        setTogglingNotifications(removeFromSet)
        setLoadingState(removeFromSet)
      }
    },
    [showFeedback, session?.user?.id],
  )

  const handleBulkMarkAsRead = useCallback(
    async (ids: string[], rows?: NotificationRow[]) => {
      if (!session?.user?.id) {
        showFeedback("error", "Lỗi", NOTIFICATION_MESSAGES.LOGIN_REQUIRED)
        return
      }

      let targetNotificationIds = ids
      let alreadyReadCount = 0

      if (rows) {
        const ownNotifications = rows.filter((row) => row.userId === session.user.id)
        const unreadNotifications = ownNotifications.filter((row) => !row.isRead)
        alreadyReadCount = ownNotifications.length - unreadNotifications.length
        targetNotificationIds = unreadNotifications.map((row) => row.id)

        if (targetNotificationIds.length === 0) {
          showFeedback(
            "error",
            NOTIFICATION_MESSAGES.NO_NOTIFICATIONS_TO_MARK,
            alreadyReadCount > 0
              ? NOTIFICATION_MESSAGES.ALL_ALREADY_READ
              : NOTIFICATION_MESSAGES.NO_OWNER_PERMISSION,
          )
          return
        }
      }

      try {
        startBulkProcessing()
        const response = await apiClient.post<{
          success: boolean
          data?: { count: number }
          error?: string
          message?: string
        }>(apiRoutes.notifications.bulk, {
          action: "mark-read",
          ids: targetNotificationIds,
        })

        const count = response.data.data?.count ?? 0

        if (count > 0) {
          showFeedback(
            "success",
            NOTIFICATION_MESSAGES.BULK_MARK_READ_SUCCESS,
            `Đã đánh dấu ${count} thông báo là đã đọc.`,
          )
          triggerTableRefresh()
        } else {
          showFeedback(
            "error",
            NOTIFICATION_MESSAGES.NO_CHANGES,
            alreadyReadCount > 0
              ? NOTIFICATION_MESSAGES.ALL_ALREADY_READ
              : response.data.message || NOTIFICATION_MESSAGES.NO_NOTIFICATIONS_UPDATED,
          )
        }
      } catch (error: unknown) {
        const errorMessage = getErrorMessage(error, "Không thể đánh dấu đã đọc các thông báo.")
        showFeedback("error", NOTIFICATION_MESSAGES.BULK_MARK_READ_ERROR, errorMessage)
      } finally {
        stopBulkProcessing()
      }
    },
    [showFeedback, triggerTableRefresh, session?.user?.id, startBulkProcessing, stopBulkProcessing],
  )

  const handleBulkMarkAsUnread = useCallback(
    async (ids: string[], rows?: NotificationRow[]) => {
      if (!session?.user?.id) {
        showFeedback("error", "Lỗi", NOTIFICATION_MESSAGES.LOGIN_REQUIRED)
        return
      }

      let targetNotificationIds = ids
      let alreadyUnreadCount = 0

      if (rows) {
        const ownNotifications = rows.filter((row) => row.userId === session.user.id)
        const readNotifications = ownNotifications.filter((row) => row.isRead)
        alreadyUnreadCount = ownNotifications.length - readNotifications.length
        targetNotificationIds = readNotifications.map((row) => row.id)

        if (targetNotificationIds.length === 0) {
          showFeedback(
            "error",
            NOTIFICATION_MESSAGES.NO_NOTIFICATIONS_TO_MARK,
            alreadyUnreadCount > 0
              ? NOTIFICATION_MESSAGES.ALL_ALREADY_UNREAD
              : NOTIFICATION_MESSAGES.NO_OWNER_PERMISSION,
          )
          return
        }
      }

      try {
        startBulkProcessing()
        const response = await apiClient.post<{
          success: boolean
          data?: { count: number }
          error?: string
          message?: string
        }>(apiRoutes.notifications.bulk, {
          action: "mark-unread",
          ids: targetNotificationIds,
        })

        const count = response.data.data?.count ?? 0

        if (count > 0) {
          showFeedback(
            "success",
            NOTIFICATION_MESSAGES.BULK_MARK_UNREAD_SUCCESS,
            `Đã đánh dấu ${count} thông báo là chưa đọc.`,
          )
          triggerTableRefresh()
        } else {
          showFeedback(
            "error",
            NOTIFICATION_MESSAGES.NO_CHANGES,
            alreadyUnreadCount > 0
              ? NOTIFICATION_MESSAGES.ALL_ALREADY_UNREAD
              : response.data.message || NOTIFICATION_MESSAGES.NO_NOTIFICATIONS_UPDATED,
          )
        }
      } catch (error: unknown) {
        const errorMessage = getErrorMessage(error, "Không thể đánh dấu chưa đọc các thông báo.")
        showFeedback("error", NOTIFICATION_MESSAGES.BULK_MARK_UNREAD_ERROR, errorMessage)
      } finally {
        stopBulkProcessing()
      }
    },
    [showFeedback, triggerTableRefresh, session?.user?.id, startBulkProcessing, stopBulkProcessing],
  )

  const handleDeleteSingle = useCallback(
    async (row: NotificationRow, refresh: () => void) => {
      const isOwner = session?.user?.id === row.userId
      
      if (!isOwner) {
        showFeedback("error", NOTIFICATION_MESSAGES.NO_PERMISSION, NOTIFICATION_MESSAGES.NO_DELETE_PERMISSION)
        return
      }

      if (row.kind === "SYSTEM") {
        showFeedback("error", "Không thể xóa", NOTIFICATION_MESSAGES.NO_DELETE_SYSTEM)
        return
      }

      setDeletingNotifications((prev) => new Set(prev).add(row.id))

      try {
        await deleteNotificationMutation.mutateAsync(row.id)
        showFeedback("success", NOTIFICATION_MESSAGES.DELETE_SUCCESS, "Thông báo đã được xóa thành công.")
        refresh()
      } catch (error: unknown) {
        const errorMessage = getErrorMessage(error, "Không thể xóa thông báo.")
        showFeedback("error", NOTIFICATION_MESSAGES.DELETE_ERROR, errorMessage)
      } finally {
        setDeletingNotifications((prev) => {
          const next = new Set(prev)
          next.delete(row.id)
          return next
        })
      }
    },
    [showFeedback, session?.user?.id, deleteNotificationMutation],
  )

  const handleBulkDelete = useCallback(
    async (ids: string[], rows?: NotificationRow[]) => {
      if (!session?.user?.id) {
        showFeedback("error", "Lỗi", NOTIFICATION_MESSAGES.LOGIN_REQUIRED)
        return
      }

      let deletableNotificationIds: string[]
      let systemCount = 0
      let otherCount = 0

      if (rows) {
        const ownNotifications = rows.filter((row) => row.userId === session.user.id)
        otherCount = rows.length - ownNotifications.length
        
        const nonSystemNotifications = ownNotifications.filter((row) => row.kind !== "SYSTEM")
        systemCount = ownNotifications.length - nonSystemNotifications.length
        
        deletableNotificationIds = nonSystemNotifications.map((row) => row.id)
      } else {
        deletableNotificationIds = ids
      }

      if (deletableNotificationIds.length === 0) {
        if (systemCount > 0) {
          showFeedback("error", "Không thể xóa", NOTIFICATION_MESSAGES.NO_DELETE_SYSTEM)
        } else {
          showFeedback("error", NOTIFICATION_MESSAGES.NO_PERMISSION, NOTIFICATION_MESSAGES.NO_DELETE_PERMISSION)
        }
        return
      }

      try {
        startBulkProcessing()
        const response = await apiClient.delete<{
          success: boolean
          data?: { count: number }
          error?: string
          message?: string
        }>(apiRoutes.notifications.deleteAll, {
          data: { ids: deletableNotificationIds },
        })

        const deletedCount = response.data.data?.count || 0

        if (deletedCount > 0) {
          let message = `Đã xóa ${deletedCount} thông báo.`
          if (systemCount > 0) {
            message += ` ${systemCount} thông báo hệ thống đã được bỏ qua.`
          }
          if (otherCount > 0) {
            message += ` ${otherCount} thông báo không thuộc về bạn đã được bỏ qua.`
          }
          showFeedback("success", NOTIFICATION_MESSAGES.BULK_DELETE_SUCCESS, message)
          triggerTableRefresh()
        } else {
          showFeedback("error", "Lỗi", NOTIFICATION_MESSAGES.NO_DELETE_OTHER)
        }
      } catch (error: unknown) {
        const errorMessage = getErrorMessage(error, "Không thể xóa các thông báo.")
        showFeedback("error", NOTIFICATION_MESSAGES.BULK_DELETE_ERROR, errorMessage)
      } finally {
        stopBulkProcessing()
      }
    },
    [showFeedback, triggerTableRefresh, session?.user?.id, startBulkProcessing, stopBulkProcessing],
  )

  return {
    handleToggleRead,
    handleBulkMarkAsRead,
    handleBulkMarkAsUnread,
    handleDeleteSingle,
    handleBulkDelete,
    togglingNotifications,
    markingReadNotifications,
    markingUnreadNotifications,
    deletingNotifications,
    bulkState,
  }
}

