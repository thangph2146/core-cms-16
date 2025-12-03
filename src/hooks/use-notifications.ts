/**
 * Hook để quản lý notifications với TanStack Query
 */
"use client"

import { useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { apiClient } from "@/lib/api/axios"
import { useSocket, type SocketNotificationPayload } from "@/hooks/use-socket"
import { queryKeys, invalidateQueries } from "@/lib/query-keys"
import { apiRoutes } from "@/lib/api/routes"
import { logger } from "@/lib/config"
import type { UnreadCountsResponse } from "@/hooks/use-unread-counts"

export interface Notification {
  id: string
  userId: string
  kind: "MESSAGE" | "SYSTEM" | "ANNOUNCEMENT" | "ALERT" | "WARNING" | "SUCCESS" | "INFO"
  title: string
  description: string | null
  isRead: boolean
  actionUrl: string | null
  metadata: Record<string, unknown> | null
  expiresAt: Date | null
  createdAt: Date
  updatedAt: Date
  readAt: Date | null
}

export interface NotificationsResponse {
  notifications: Notification[]
  total: number
  unreadCount: number
  hasMore: boolean
}

/**
 * Helper function để parse notification dates từ API response
 */
function parseNotificationDates(notification: {
  createdAt: string | Date
  updatedAt: string | Date
  expiresAt?: string | Date | null
  readAt?: string | Date | null
}): {
  createdAt: Date
  updatedAt: Date
  expiresAt: Date | null
  readAt: Date | null
} {
  return {
    createdAt: notification.createdAt instanceof Date ? notification.createdAt : new Date(notification.createdAt),
    updatedAt: notification.updatedAt instanceof Date ? notification.updatedAt : new Date(notification.updatedAt),
    expiresAt: notification.expiresAt ? (notification.expiresAt instanceof Date ? notification.expiresAt : new Date(notification.expiresAt)) : null,
    readAt: notification.readAt ? (notification.readAt instanceof Date ? notification.readAt : new Date(notification.readAt)) : null,
  }
}

/**
 * Hook để fetch notifications với pagination và filters
 * @param options - Options cho việc fetch notifications
 * @param options.limit - Số lượng notifications mỗi lần fetch (default: 20)
 * @param options.offset - Offset cho pagination (default: 0)
 * @param options.unreadOnly - Chỉ fetch unread notifications (default: false)
 * @param options.refetchInterval - Interval để refetch (default: 30000ms)
 * @param options.disablePolling - Tắt polling khi có socket connection (default: false)
 */
export function useNotifications(options?: {
  limit?: number
  offset?: number
  unreadOnly?: boolean
  refetchInterval?: number
  disablePolling?: boolean
}) {
  const { data: session } = useSession()
  const { limit = 20, offset = 0, unreadOnly = false, refetchInterval = 30000, disablePolling = false } = options || {}

  return useQuery<NotificationsResponse>({
    queryKey: queryKeys.notifications.user(session?.user?.id, { limit, offset, unreadOnly }),
    queryFn: async () => {
      logger.debug("useNotifications: Fetching notifications", {
        userId: session?.user?.id,
        limit,
        offset,
        unreadOnly,
      })
      
      const response = await apiClient.get<{
        success: boolean
        data?: NotificationsResponse
        error?: string
        message?: string
      }>(apiRoutes.notifications.list({ limit, offset, unreadOnly }))

      const payload = response.data.data
      if (!payload) {
        logger.error("useNotifications: Failed to fetch notifications", {
          error: response.data.error || response.data.message,
          userId: session?.user?.id,
        })
        throw new Error(response.data.error || response.data.message || "Không thể tải thông báo")
      }

      logger.debug("useNotifications: Notifications fetched successfully", {
        userId: session?.user?.id,
        total: payload.total,
        unreadCount: payload.unreadCount,
        notificationsCount: payload.notifications.length,
      })

      return {
        ...payload,
        notifications: payload.notifications.map((notification) => ({
          ...notification,
          ...parseNotificationDates(notification),
        })),
      }
    },
    enabled: !!session?.user?.id,
    // Chỉ polling nếu không có socket connection (disablePolling = false)
    // Socket sẽ handle real-time updates, polling chỉ là fallback
    refetchInterval: disablePolling ? false : refetchInterval,
    // Tăng staleTime để giảm refetch không cần thiết
    // staleTime phải >= refetchInterval để tránh refetch liên tục
    staleTime: disablePolling ? 120000 : refetchInterval, // 120s nếu có socket, bằng refetchInterval nếu không
    // Tăng gcTime để cache lâu hơn
    gcTime: 5 * 60 * 1000, // 5 phút
    // Tránh refetch khi component remount hoặc window focus
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Chỉ refetch khi data thực sự stale
    refetchOnReconnect: true, // Chỉ refetch khi reconnect
  })
}

/**
 * Hook để đánh dấu notification là đã đọc/chưa đọc
 * Tự động invalidate queries sau khi thành công
 */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()

  return useMutation({
    mutationFn: async ({ id, isRead = true }: { id: string; isRead?: boolean }) => {
      logger.debug("useMarkNotificationRead: Marking notification", {
        notificationId: id,
        isRead,
        userId: session?.user?.id,
      })
      
      const response = await apiClient.patch<{
        success: boolean
        data?: Notification
        error?: string
        message?: string
      }>(apiRoutes.notifications.markRead(id), { isRead })

      const payload = response.data.data
      if (!payload) {
        logger.error("useMarkNotificationRead: Failed to mark notification", {
          notificationId: id,
          error: response.data.error || response.data.message,
          userId: session?.user?.id,
        })
        throw new Error(response.data.error || response.data.message || "Không thể cập nhật thông báo")
      }

      logger.success("useMarkNotificationRead: Notification marked successfully", {
        notificationId: id,
        isRead: payload.isRead,
        userId: session?.user?.id,
      })

      return {
        ...payload,
        ...parseNotificationDates(payload),
      }
    },
    onSuccess: () => {
      // Invalidate cả user và admin notifications vì thay đổi trạng thái đọc ảnh hưởng đến cả 2
      // Admin table cần cập nhật ngay khi notification được đánh dấu đã đọc/chưa đọc
      // Cũng invalidate unreadCounts để cập nhật badge count trong nav-main-with-badges
      invalidateQueries.notificationsAndCounts(queryClient, session?.user?.id)
    },
  })
}

/**
 * Hook để xóa một notification
 * Tự động invalidate queries sau khi thành công
 */
export function useDeleteNotification() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(apiRoutes.notifications.delete(id))
      return id
    },
    onSuccess: () => {
      // Invalidate cả user và admin notifications vì xóa notification ảnh hưởng đến cả 2
      invalidateQueries.allNotifications(queryClient, session?.user?.id)
    },
    onError: (error: unknown) => {
      // Error message sẽ được hiển thị bởi component sử dụng hook này
      console.error("Error deleting notification:", error)
    },
  })
}

/**
 * Hook để đánh dấu tất cả notifications là đã đọc
 * Tự động invalidate queries sau khi thành công
 */
export function useMarkAllAsRead() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()

  return useMutation({
    mutationFn: async () => {
      logger.debug("useMarkAllAsRead: Marking all as read", {
        userId: session?.user?.id,
      })
      
      const response = await apiClient.post<{
        success: boolean
        data?: { count: number }
        error?: string
        message?: string
      }>(apiRoutes.notifications.markAllRead)

      const payload = response.data.data
      if (!payload) {
        logger.error("useMarkAllAsRead: Failed to mark all as read", {
          error: response.data.error || response.data.message,
          userId: session?.user?.id,
        })
        throw new Error(response.data.error || response.data.message || "Không thể đánh dấu tất cả đã đọc")
      }
      
      logger.success("useMarkAllAsRead: All notifications marked as read", {
        count: payload.count,
        userId: session?.user?.id,
      })
      
      return payload
    },
    onSuccess: () => {
      // Invalidate cả user và admin notifications vì đánh dấu tất cả đã đọc ảnh hưởng đến cả 2
      // Admin table cần cập nhật ngay khi tất cả notifications được đánh dấu đã đọc
      // Cũng invalidate unreadCounts để cập nhật badge count trong nav-main-with-badges
      invalidateQueries.notificationsAndCounts(queryClient, session?.user?.id)
    },
  })
}

/**
 * Hook để xóa tất cả notifications
 * Tự động invalidate queries sau khi thành công
 */
export function useDeleteAllNotifications() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.delete<{
        success: boolean
        data?: { count: number }
        error?: string
        message?: string
      }>(apiRoutes.notifications.deleteAll)

      const payload = response.data.data
      if (!payload) {
        throw new Error(response.data.error || response.data.message || "Không thể xóa tất cả thông báo")
      }
      return payload
    },
    onSuccess: () => {
      // Invalidate cả user và admin notifications vì xóa tất cả ảnh hưởng đến cả 2
      invalidateQueries.allNotifications(queryClient, session?.user?.id)
    },
    onError: (error: unknown) => {
      console.error("Error deleting all notifications:", error)
    },
  })
}

/**
 * Module-level tracking để đảm bảo chỉ đăng ký listener một lần cho mỗi userId
 */
const registeredUsers = new Set<string>()

/**
 * Hook để quản lý Socket.IO real-time updates cho User Notifications.
 * Tự động cập nhật cache khi có socket events:
 * - notification:new: Khi có notification mới
 * - notification:updated: Khi notification được cập nhật
 * - notifications:sync: Khi có sync request từ server
 */
export function useNotificationsSocketBridge() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const primaryRole = session?.roles?.[0]?.name ?? null

  const { socket, onNotification, onNotificationUpdated, onNotificationsSync } = useSocket({
    userId: session?.user?.id,
    role: primaryRole,
  })

  useEffect(() => {
    const userId = session?.user?.id
    if (!userId) return

    // Chỉ đăng ký listener một lần cho mỗi userId
    if (registeredUsers.has(userId)) {
      return
    }
    registeredUsers.add(userId)

    // Helper để convert SocketNotificationPayload sang Notification format
    const convertSocketToNotification = (payload: SocketNotificationPayload): Notification => {
      const timestamp = payload.timestamp ?? Date.now()
      const kind = typeof payload.kind === "string" ? payload.kind.toUpperCase() : "SYSTEM"
      return {
        id: payload.id,
        userId,
        kind: kind as Notification["kind"],
        title: payload.title,
        description: payload.description ?? null,
        isRead: payload.read ?? false,
        actionUrl: payload.actionUrl ?? null,
        metadata: payload.metadata ?? null,
        expiresAt: null,
        createdAt: new Date(timestamp),
        updatedAt: new Date(timestamp),
        readAt: payload.read ? new Date(timestamp) : null,
      }
    }

    const getExistingNotificationState = (notificationId: string): { isRead?: boolean } => {
      const existingQueries = queryClient.getQueriesData<NotificationsResponse>({
        queryKey: queryKeys.notifications.allUser(userId) as unknown[],
      })

      for (const [, data] of existingQueries) {
        const found = data?.notifications.find((notification) => notification.id === notificationId)
        if (found) {
          return { isRead: found.isRead }
        }
      }

      return {}
    }

    const updateUnreadCountsByDelta = (delta: number) => {
      if (delta === 0) return

      queryClient.setQueryData<UnreadCountsResponse>(
        queryKeys.unreadCounts.user(userId) as unknown[],
        (current) => {
          if (!current) {
            // Nếu chưa có data và delta < 0, không làm gì (không thể có unread count âm)
            if (delta < 0) {
              return undefined
            }
            // Nếu delta > 0, tạo data mới
            return {
              unreadMessages: 0,
              unreadNotifications: Math.max(0, delta),
              contactRequests: 0,
            }
          }

          const next = Math.max(0, current.unreadNotifications + delta)
          if (next === current.unreadNotifications) return current

          return {
            ...current,
            unreadNotifications: next,
          }
        },
      )
    }

    const setUnreadCountsValue = (value: number) => {
      queryClient.setQueryData<UnreadCountsResponse>(
        queryKeys.unreadCounts.user(userId) as unknown[],
        (current) => {
          if (!current) {
            return {
              unreadMessages: 0,
              unreadNotifications: value,
              contactRequests: 0,
            }
          }

          if (current.unreadNotifications === value) {
            return current
          }

          return {
            ...current,
            unreadNotifications: value,
          }
        },
      )
    }

    const applyNotificationUpdate = (payload: SocketNotificationPayload) => {
      const notification = convertSocketToNotification(payload)
      const previousState = getExistingNotificationState(notification.id)
      const previousIsRead = previousState.isRead
      const currentIsRead = notification.isRead

      let unreadDelta = 0
      if (previousIsRead === undefined) {
        unreadDelta = currentIsRead ? 0 : 1
      } else if (previousIsRead !== currentIsRead) {
        unreadDelta = currentIsRead ? -1 : 1
      }

      queryClient.setQueriesData<NotificationsResponse>(
        { queryKey: queryKeys.notifications.allUser(userId) as unknown[] },
        (oldData) => {
          if (!oldData) {
            return oldData
          }

          const capacity = oldData.notifications.length > 0 ? oldData.notifications.length : 20
          const existingIndex = oldData.notifications.findIndex((n) => n.id === notification.id)

          let notifications = oldData.notifications
          let total = oldData.total

          if (existingIndex >= 0) {
            const nextNotifications = [...notifications]
            nextNotifications[existingIndex] = notification
            notifications = nextNotifications
          } else {
            const nextNotifications = [notification, ...notifications]
            notifications = nextNotifications
            total += 1
            if (capacity > 0 && notifications.length > capacity) {
              notifications = notifications.slice(0, capacity)
            }
          }

          const unreadCount = Math.max(0, oldData.unreadCount + unreadDelta)
          const hasMore = oldData.hasMore || total > notifications.length

          return {
            ...oldData,
            notifications,
            total,
            unreadCount,
            hasMore,
          }
        },
      )

      if (unreadDelta !== 0) {
        updateUnreadCountsByDelta(unreadDelta)
      }
    }

    const stopNew = onNotification((payload: SocketNotificationPayload) => {
      // Chỉ update cache nếu notification dành cho user này
      // Không log ở đây để tránh duplicate logs (useAdminNotificationsSocketBridge cũng log)
      if (payload.toUserId === userId) {
        applyNotificationUpdate(payload)
      }
    })

    const stopUpdated = onNotificationUpdated((payload: SocketNotificationPayload) => {
      // Chỉ update cache nếu notification dành cho user này
      // Không log ở đây để tránh duplicate logs (useAdminNotificationsSocketBridge cũng log)
      if (payload.toUserId === userId) {
        applyNotificationUpdate(payload)
      }
    })

    const stopSync = onNotificationsSync((payloads: SocketNotificationPayload[]) => {
      // Lọc và convert notifications cho user này
      const userNotifications = payloads
        .filter((p) => p.toUserId === userId)
        .map(convertSocketToNotification)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      
      // Filter duplicates by ID (quan trọng để tránh duplicate notifications)
      const seen = new Set<string>()
      const uniqueNotifications: Notification[] = []
      const duplicateIds = new Set<string>()
      
      for (const notification of userNotifications) {
        if (!seen.has(notification.id)) {
          seen.add(notification.id)
          uniqueNotifications.push(notification)
        } else {
          duplicateIds.add(notification.id)
        }
      }
      
      if (duplicateIds.size > 0) {
        logger.warn("useNotificationsSocketBridge: Duplicate notifications in sync payload", {
          userId,
          totalPayloads: payloads.length,
          userNotificationsCount: userNotifications.length,
          uniqueCount: uniqueNotifications.length,
          duplicateCount: duplicateIds.size,
          duplicateIds: Array.from(duplicateIds),
        })
      }
      
      const unreadCount = uniqueNotifications.filter((n) => !n.isRead).length
      
      logger.debug("useNotificationsSocketBridge: Processing notifications:sync", {
        userId,
        totalPayloads: payloads.length,
        userNotificationsCount: userNotifications.length,
        uniqueCount: uniqueNotifications.length,
        unreadCount,
      })
      
      // Update cache với toàn bộ notifications mới (đã filter duplicates)
      queryClient.setQueriesData<NotificationsResponse>(
        { queryKey: queryKeys.notifications.allUser(userId) as unknown[] },
        (oldData) => {
          if (!oldData) {
            return {
              notifications: uniqueNotifications.slice(0, 20),
              total: uniqueNotifications.length,
              unreadCount,
              hasMore: uniqueNotifications.length > 20,
            }
          }

          const capacity = oldData.notifications.length > 0 ? oldData.notifications.length : 20
          const limitedNotifications =
            capacity > 0 ? uniqueNotifications.slice(0, capacity) : uniqueNotifications
          const hasMore = uniqueNotifications.length > limitedNotifications.length

          return {
            ...oldData,
            notifications: limitedNotifications,
            total: uniqueNotifications.length,
            unreadCount,
            hasMore,
          }
        },
      )

      // Update unread counts
      setUnreadCountsValue(unreadCount)
    })

    // Xử lý xóa notification đơn lẻ
    const handleNotificationDeleted = (payload: { id?: string; notificationId?: string }) => {
      const notificationId = payload.id || payload.notificationId
      if (!notificationId) return

      let deletedNotification: Notification | undefined

      queryClient.setQueriesData<NotificationsResponse>(
        { queryKey: queryKeys.notifications.allUser(userId) as unknown[] },
        (oldData) => {
          if (!oldData) return oldData

          const notification = oldData.notifications.find((n) => n.id === notificationId)
          if (!notification) return oldData

          deletedNotification = notification
          const wasUnread = !notification.isRead
          const newNotifications = oldData.notifications.filter((n) => n.id !== notificationId)
          const newTotal = Math.max(0, oldData.total - 1)
          const newUnreadCount = wasUnread ? Math.max(0, oldData.unreadCount - 1) : oldData.unreadCount

          return {
            ...oldData,
            notifications: newNotifications,
            total: newTotal,
            unreadCount: newUnreadCount,
          }
        },
      )

      // Update unread counts
      if (deletedNotification) {
        updateUnreadCountsByDelta(deletedNotification.isRead ? 0 : -1)
      }
    }

    // Xử lý xóa nhiều notifications
    const handleNotificationsDeleted = (payload: { ids?: string[]; notificationIds?: string[] }) => {
      const notificationIds = payload.ids || payload.notificationIds || []
      if (notificationIds.length === 0) return

      let deletedNotifications: Notification[] = []
      let unreadDeletedCount = 0

      queryClient.setQueriesData<NotificationsResponse>(
        { queryKey: queryKeys.notifications.allUser(userId) as unknown[] },
        (oldData) => {
          if (!oldData) return oldData

          deletedNotifications = oldData.notifications.filter((n) => notificationIds.includes(n.id))
          unreadDeletedCount = deletedNotifications.filter((n) => !n.isRead).length
          const newNotifications = oldData.notifications.filter((n) => !notificationIds.includes(n.id))
          const newTotal = Math.max(0, oldData.total - deletedNotifications.length)
          const newUnreadCount = Math.max(0, oldData.unreadCount - unreadDeletedCount)

          return {
            ...oldData,
            notifications: newNotifications,
            total: newTotal,
            unreadCount: newUnreadCount,
          }
        },
      )

      // Update unread counts
      if (unreadDeletedCount > 0) {
        updateUnreadCountsByDelta(-unreadDeletedCount)
      }
    }

    // Đăng ký socket listeners cho delete events
    socket?.on("notification:deleted", handleNotificationDeleted)
    socket?.on("notifications:deleted", handleNotificationsDeleted)

    return () => {
      stopNew?.()
      stopUpdated?.()
      stopSync?.()
      if (socket) {
        socket.off("notification:deleted", handleNotificationDeleted)
        socket.off("notifications:deleted", handleNotificationsDeleted)
      }
      registeredUsers.delete(userId)
    }
  }, [session?.user?.id, socket, onNotification, onNotificationUpdated, onNotificationsSync, queryClient])

  return { socket }
}

/**
 * Hook để quản lý Socket.IO real-time updates cho Admin Notifications Table.
 * Tự động invalidate admin notifications queries khi có socket events:
 * - notification:new: Khi có notification mới
 * - notification:updated: Khi notification được cập nhật (đánh dấu đọc/chưa đọc, xóa, etc.)
 * - notifications:sync: Khi có sync request từ server
 * - notification:admin: Khi có notification admin-specific
 */
export function useAdminNotificationsSocketBridge() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const primaryRole = session?.roles?.[0]?.name ?? null

  const { socket, onNotification, onNotificationUpdated, onNotificationsSync } = useSocket({
    userId: session?.user?.id,
    role: primaryRole,
  })

  useEffect(() => {
    const userId = session?.user?.id
    if (!userId || !socket) return

    const invalidate = () => {
      // Chỉ invalidate admin notifications; client-side socket bridge đã đồng bộ user notifications
      invalidateQueries.adminNotifications(queryClient)
    }

    const stopNew = onNotification(() => {
      logger.debug("Socket notification:new received (admin)", { userId })
      invalidate()
    })
    const stopUpdated = onNotificationUpdated(() => {
      logger.debug("Socket notification:updated received (admin)", { userId })
      invalidate()
    })
    const stopSync = onNotificationsSync(() => {
      logger.debug("Socket notifications:sync received (admin)", { userId })
      invalidate()
    })

    // Lắng nghe events xóa notification
    const handleDeleted = () => {
      logger.debug("Socket notification:deleted received (admin)", { userId })
      invalidate()
    }
    const handleBulkDeleted = () => {
      logger.debug("Socket notifications:deleted received (admin)", { userId })
      invalidate()
    }

    socket.on("notification:deleted", handleDeleted)
    socket.on("notifications:deleted", handleBulkDeleted)

    return () => {
      stopNew?.()
      stopUpdated?.()
      stopSync?.()
      if (socket) {
        socket.off("notification:deleted", handleDeleted)
        socket.off("notifications:deleted", handleBulkDeleted)
      }
    }
  }, [session?.user?.id, socket, onNotification, onNotificationUpdated, onNotificationsSync, queryClient])

  return { socket }
}

