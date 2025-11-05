/**
 * Hook để quản lý notifications với TanStack Query
 */
"use client"

import { useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { apiClient } from "@/lib/api/axios"
import { useSocket } from "@/hooks/use-socket"
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
      const response = await apiClient.get<NotificationsResponse>(
        apiRoutes.notifications.list({ limit, offset, unreadOnly })
      )
      return response.data
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
      const response = await apiClient.patch<Notification>(apiRoutes.notifications.markRead(id), { isRead })
      return response.data
    },
    onSuccess: () => {
      // Invalidate cả user và admin notifications vì thay đổi trạng thái đọc ảnh hưởng đến cả 2
      // Admin table cần cập nhật ngay khi notification được đánh dấu đã đọc/chưa đọc
      invalidateQueries.allNotifications(queryClient, session?.user?.id)
    },
  })
}

// Delete notification
export function useDeleteNotification() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(apiRoutes.notifications.delete(id))
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
      const response = await apiClient.post<{ success: boolean; count: number }>(
        apiRoutes.notifications.markAllRead
      )
      return response.data
    },
    onSuccess: () => {
      // Invalidate cả user và admin notifications vì đánh dấu tất cả đã đọc ảnh hưởng đến cả 2
      // Admin table cần cập nhật ngay khi tất cả notifications được đánh dấu đã đọc
      invalidateQueries.allNotifications(queryClient, session?.user?.id)
    },
  })
}

// Delete all notifications
export function useDeleteAllNotifications() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.delete<{ success: boolean; count: number; message: string }>(
        apiRoutes.notifications.deleteAll
      )
      return response.data
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

    const invalidate = () => {
      // Invalidate cả user và admin notifications để đồng bộ giữa Notification Bell và Admin Table
      invalidateQueries.allNotifications(queryClient, userId)
    }

    const stopNew = onNotification(() => {
      logger.debug("Socket notification:new received", { userId })
      invalidate()
    })
    const stopUpdated = onNotificationUpdated(() => {
      logger.debug("Socket notification:updated received", { userId })
      invalidate()
    })
    const stopSync = onNotificationsSync(() => {
      logger.debug("Socket notifications:sync received", { userId })
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
    if (!userId) return

    const invalidate = () => {
      // Invalidate cả user và admin notifications để đồng bộ giữa Notification Bell và Admin Table
      invalidateQueries.allNotifications(queryClient, userId)
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

    return () => {
      stopNew?.()
      stopUpdated?.()
      stopSync?.()
    }
  }, [session?.user?.id, onNotification, onNotificationUpdated, onNotificationsSync, queryClient])

  return { socket }
}
