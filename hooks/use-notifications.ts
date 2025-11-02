/**
 * Hook để quản lý notifications với TanStack Query
 */
"use client"

import { useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { apiClient } from "@/lib/api/axios"
import { useSocket } from "@/hooks/use-socket"

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
}) {
  const { data: session } = useSession()
  const { limit = 20, offset = 0, unreadOnly = false, refetchInterval = 30000 } = options || {}

  return useQuery<NotificationsResponse>({
    queryKey: ["notifications", session?.user?.id, limit, offset, unreadOnly],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
        unreadOnly: unreadOnly.toString(),
      })
      const response = await apiClient.get<NotificationsResponse>(
        `notifications?${params.toString()}`
      )
      return response.data
    },
    enabled: !!session?.user?.id,
    refetchInterval: refetchInterval, // Polling mỗi 30 giây
    staleTime: 10000, // 10 giây
  })
}

// Mark notification as read
export function useMarkNotificationRead() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()

  return useMutation({
    mutationFn: async ({ id, isRead = true }: { id: string; isRead?: boolean }) => {
      const response = await apiClient.patch<Notification>(`notifications/${id}`, { isRead })
      return response.data
    },
    onSuccess: () => {
      // Invalidate và refetch notifications
      queryClient.invalidateQueries({
        queryKey: ["notifications", session?.user?.id],
      })
    },
  })
}

// Delete notification
export function useDeleteNotification() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`notifications/${id}`)
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["notifications", session?.user?.id],
      })
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
        "notifications/mark-all-read"
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["notifications", session?.user?.id],
      })
    },
  })
}

export function useNotificationsSocketBridge() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  // Lấy role từ session.roles (không phải session.user.roles)
  const primaryRole = session?.roles?.[0]?.name ?? null

  const { socket, onNotification, onNotificationUpdated, onNotificationsSync } = useSocket({
    userId: session?.user?.id,
    role: primaryRole,
  })

  useEffect(() => {
    const userId = session?.user?.id
    if (!userId) return

    const invalidate = () => {
      queryClient.invalidateQueries({
        queryKey: ["notifications", userId],
      })
    }

    const stopNew = onNotification(() => {
      invalidate()
    })

    const stopUpdated = onNotificationUpdated(() => {
      invalidate()
    })

    const stopSync = onNotificationsSync(() => {
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
