/**
 * Query Keys Configuration
 * 
 * Tập trung quản lý tất cả query keys cho TanStack Query
 * Theo chuẩn Next.js 16: chỉ invalidate những queries thực sự cần thiết
 */

import type { QueryClient } from "@tanstack/react-query"

type FilterRecord = Record<string, string | undefined>

function normalizeFilters(filters?: FilterRecord) {
  if (!filters) return undefined
  const entries = Object.entries(filters).filter(([, value]) => value !== undefined && value !== "")
  if (entries.length === 0) return undefined
  entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  return entries.reduce<Record<string, string>>((acc, [key, value]) => {
    if (value !== undefined) {
      acc[key] = value
    }
    return acc
  }, {})
}

export interface AdminCommentsListParams {
  status: "active" | "deleted" | "all"
  page: number
  limit: number
  search?: string
  filters?: Record<string, string>
}

/**
 * Query Keys Factory Pattern
 * Giúp type-safe và dễ quản lý query keys
 */
export const queryKeys = {
  // Notifications
  notifications: {
    // User notifications (NotificationBell)
    user: (userId: string | undefined, options?: { limit?: number; offset?: number; unreadOnly?: boolean }): readonly unknown[] => {
      if (!userId) return ["notifications", "user", null]
      const { limit, offset, unreadOnly } = options || {}
      const keys: unknown[] = ["notifications", "user", userId]
      if (limit !== undefined) keys.push(limit)
      if (offset !== undefined) keys.push(offset)
      if (unreadOnly !== undefined) keys.push(unreadOnly)
      return keys as readonly unknown[]
    },
    // Admin notifications (Admin Table)
    admin: (): readonly unknown[] => ["notifications", "admin"],
    // Tất cả user notifications (không phân biệt params)
    allUser: (userId: string | undefined): readonly unknown[] => {
      if (!userId) return ["notifications", "user"]
      return ["notifications", "user", userId]
    },
    // Tất cả admin notifications
    allAdmin: (): readonly unknown[] => ["notifications", "admin"],
  },

  // Users
  users: {
    list: (params?: { page?: number; limit?: number; search?: string; status?: string }): readonly unknown[] => {
      const { page, limit, search, status } = params || {}
      const keys: unknown[] = ["users", "list"]
      if (page !== undefined) keys.push(page)
      if (limit !== undefined) keys.push(limit)
      if (search !== undefined) keys.push(search)
      if (status !== undefined) keys.push(status)
      return keys as readonly unknown[]
    },
    detail: (id: string): readonly unknown[] => ["users", "detail", id],
    all: (): readonly unknown[] => ["users"],
  },

  // Roles
  roles: {
    list: (): readonly unknown[] => ["roles", "list"],
    all: (): readonly unknown[] => ["roles"],
  },

  // Unread counts
  unreadCounts: {
    user: (userId: string | undefined): readonly unknown[] => {
      if (!userId) return ["unreadCounts", "user", null]
      return ["unreadCounts", "user", userId]
    },
    all: (): readonly unknown[] => ["unreadCounts"],
  },

  // Admin Comments
  adminComments: {
    all: (): readonly unknown[] => ["adminComments"],
    list: (params: AdminCommentsListParams): readonly unknown[] => {
      const normalized: AdminCommentsListParams = {
        status: params.status,
        page: params.page,
        limit: params.limit,
        search: params.search,
        filters: normalizeFilters(params.filters),
      }
      return ["adminComments", normalized]
    },
  },
}

/**
 * Helper functions để invalidate queries một cách chính xác
 */
export const invalidateQueries = {
  /**
   * Invalidate user notifications
   * Chỉ invalidate queries của user cụ thể với các params cụ thể
   */
  userNotifications: (queryClient: QueryClient, userId: string | undefined, options?: { exact?: boolean }) => {
    if (!userId) return
    const { exact = false } = options || {}
    
    if (exact) {
      // Chỉ invalidate query chính xác với params - tốn ít tài nguyên hơn
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.user(userId) as unknown[],
      })
    } else {
      // Invalidate tất cả queries của user này (bao gồm các params khác nhau)
      // Dùng khi không biết chính xác params nào đang được sử dụng
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.allUser(userId) as unknown[],
      })
    }
  },

  /**
   * Invalidate admin notifications
   * Chỉ invalidate admin table queries
   */
  adminNotifications: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.notifications.admin() as unknown[],
    })
  },

  /**
   * Invalidate cả user và admin notifications
   * Chỉ dùng khi thay đổi ảnh hưởng đến cả 2 (ví dụ: xóa notification)
   */
  allNotifications: (queryClient: QueryClient, userId: string | undefined, options?: { exact?: boolean }) => {
    invalidateQueries.userNotifications(queryClient, userId, options)
    invalidateQueries.adminNotifications(queryClient)
  },

  /**
   * Invalidate unread counts
   * Dùng khi notifications hoặc messages được đánh dấu đọc/chưa đọc
   */
  unreadCounts: (queryClient: QueryClient, userId: string | undefined) => {
    if (!userId) return
    queryClient.invalidateQueries({
      queryKey: queryKeys.unreadCounts.user(userId) as unknown[],
    })
  },

  /**
   * Invalidate cả notifications và unread counts
   * Dùng khi mark notification as read/unread để cập nhật cả badge count
   */
  notificationsAndCounts: (queryClient: QueryClient, userId: string | undefined, options?: { exact?: boolean }) => {
    invalidateQueries.allNotifications(queryClient, userId, options)
    invalidateQueries.unreadCounts(queryClient, userId)
  },
}

