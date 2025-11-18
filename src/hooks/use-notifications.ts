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

// Fetch notifications
export function useNotifications(options?: {
  limit?: number
  offset?: number
  unreadOnly?: boolean
  refetchInterval?: number
  // Tắt polling khi có socket connection (socket sẽ handle real-time updates)
  disablePolling?: boolean
}) {
  const { data: session } = useSession()
  const { limit = 20, offset = 0, unreadOnly = false, refetchInterval = 30000, disablePolling = false } = options || {}

  return useQuery<NotificationsResponse>({
    queryKey: queryKeys.notifications.user(session?.user?.id, { limit, offset, unreadOnly }),
    queryFn: async () => {
      const response = await apiClient.get<{
        success: boolean
        data?: NotificationsResponse
        error?: string
        message?: string
      }>(apiRoutes.notifications.list({ limit, offset, unreadOnly }))

      const payload = response.data.data
      if (!payload) {
        throw new Error(response.data.error || response.data.message || "Không thể tải thông báo")
      }

      return {
        ...payload,
        notifications: payload.notifications.map((notification) => ({
          ...notification,
          createdAt: new Date(notification.createdAt),
          updatedAt: new Date(notification.updatedAt),
          expiresAt: notification.expiresAt ? new Date(notification.expiresAt) : null,
          readAt: notification.readAt ? new Date(notification.readAt) : null,
        })),
      }
    },
    enabled: !!session?.user?.id,
    // Chỉ polling nếu không có socket connection (disablePolling = false)
    // Socket sẽ handle real-time updates, polling chỉ là fallback
    refetchInterval: disablePolling ? false : refetchInterval,
    // Tăng staleTime để giảm refetch không cần thiết khi có socket
    staleTime: disablePolling ? 60000 : 30000, // 60s nếu có socket, 30s nếu không
    // Tăng gcTime để cache lâu hơn
    gcTime: 5 * 60 * 1000, // 5 phút
  })
}

// Mark notification as read
export function useMarkNotificationRead() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()

  return useMutation({
    mutationFn: async ({ id, isRead = true }: { id: string; isRead?: boolean }) => {
      const response = await apiClient.patch<{
        success: boolean
        data?: Notification
        error?: string
        message?: string
      }>(apiRoutes.notifications.markRead(id), { isRead })

      const payload = response.data.data
      if (!payload) {
        throw new Error(response.data.error || response.data.message || "Không thể cập nhật thông báo")
      }

      return {
        ...payload,
        createdAt: new Date(payload.createdAt),
        updatedAt: new Date(payload.updatedAt),
        expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : null,
        readAt: payload.readAt ? new Date(payload.readAt) : null,
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

// Delete notification
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

// Mark all as read
export function useMarkAllAsRead() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post<{
        success: boolean
        data?: { count: number }
        error?: string
        message?: string
      }>(apiRoutes.notifications.markAllRead)

      const payload = response.data.data
      if (!payload) {
        throw new Error(response.data.error || response.data.message || "Không thể đánh dấu tất cả đã đọc")
      }
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

// Delete all notifications
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

    // Helper để update cache trực tiếp
    const updateCache = (updater: (oldData: NotificationsResponse | undefined) => NotificationsResponse | undefined) => {
      // Update tất cả user notification queries với các params khác nhau
      queryClient.setQueriesData<NotificationsResponse>(
        { queryKey: queryKeys.notifications.allUser(userId) as unknown[] },
        updater
      )
    }

    const invalidate = () => {
      // Invalidate cả user và admin notifications để đồng bộ giữa Notification Bell và Admin Table
      // Cũng invalidate unreadCounts để cập nhật badge count trong nav-main-with-badges
      invalidateQueries.notificationsAndCounts(queryClient, userId)
    }

    const stopNew = onNotification((payload: SocketNotificationPayload) => {
      logger.debug("Socket notification:new received", { userId, notificationId: payload.id })
      
      // Chỉ update cache nếu notification dành cho user này
      if (payload.toUserId === userId) {
        // Update cache trực tiếp - thêm notification mới vào đầu danh sách
        updateCache((oldData) => {
          if (!oldData) return oldData
          
          const newNotification = convertSocketToNotification(payload)
          
          // Kiểm tra xem notification đã tồn tại chưa (tránh duplicate)
          const exists = oldData.notifications.some((n) => n.id === newNotification.id)
          if (exists) {
            // Nếu đã tồn tại, update nó
            return {
              ...oldData,
              notifications: oldData.notifications.map((n) =>
                n.id === newNotification.id ? newNotification : n
              ),
              unreadCount: newNotification.isRead ? oldData.unreadCount : oldData.unreadCount + 1,
            }
          }
          
          // Thêm notification mới vào đầu danh sách
          return {
            ...oldData,
            notifications: [newNotification, ...oldData.notifications],
            total: oldData.total + 1,
            unreadCount: newNotification.isRead ? oldData.unreadCount : oldData.unreadCount + 1,
          }
        })
      }
      
      // Invalidate để trigger refetch nếu cần
      invalidate()
    })

    const stopUpdated = onNotificationUpdated((payload: SocketNotificationPayload) => {
      logger.debug("Socket notification:updated received", { userId, notificationId: payload.id })
      
      // Chỉ update cache nếu notification dành cho user này
      if (payload.toUserId === userId) {
        // Update cache trực tiếp
        updateCache((oldData) => {
          if (!oldData) return oldData
          
          const updatedNotification = convertSocketToNotification(payload)
          const oldNotification = oldData.notifications.find((n) => n.id === updatedNotification.id)
          
          if (!oldNotification) {
            // Nếu không tìm thấy, thêm mới
            return {
              ...oldData,
              notifications: [updatedNotification, ...oldData.notifications],
              total: oldData.total + 1,
              unreadCount: updatedNotification.isRead ? oldData.unreadCount : oldData.unreadCount + 1,
            }
          }
          
          // Update notification trong danh sách
          const wasRead = oldNotification.isRead
          const isNowRead = updatedNotification.isRead
          
          return {
            ...oldData,
            notifications: oldData.notifications.map((n) =>
              n.id === updatedNotification.id ? updatedNotification : n
            ),
            unreadCount: wasRead !== isNowRead
              ? isNowRead
                ? Math.max(0, oldData.unreadCount - 1)
                : oldData.unreadCount + 1
              : oldData.unreadCount,
          }
        })
      }
      
      // Invalidate để trigger refetch nếu cần
      invalidate()
    })

    const stopSync = onNotificationsSync((payloads: SocketNotificationPayload[]) => {
      logger.debug("Socket notifications:sync received", { userId, count: payloads.length })
      
      // Update cache với toàn bộ notifications mới
      updateCache(() => {
        const notifications = payloads
          .filter((p) => p.toUserId === userId)
          .map(convertSocketToNotification)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        
        const unreadCount = notifications.filter((n) => !n.isRead).length
        
        return {
          notifications: notifications.slice(0, 20), // Limit to 20 for bell
          total: notifications.length,
          unreadCount,
          hasMore: notifications.length > 20,
        }
      })
      
      // Invalidate để trigger refetch nếu cần
      invalidate()
    })

    return () => {
      stopNew?.()
      stopUpdated?.()
      stopSync?.()
    }
  }, [session?.user?.id, onNotification, onNotificationUpdated, onNotificationsSync, queryClient])

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
      // Invalidate cả user và admin notifications để đồng bộ giữa Notification Bell và Admin Table
      // Cũng invalidate unreadCounts để cập nhật badge count trong nav-main-with-badges
      invalidateQueries.notificationsAndCounts(queryClient, userId)
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
