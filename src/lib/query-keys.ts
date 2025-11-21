/**
 * Query Keys Configuration
 * 
 * Tập trung quản lý tất cả query keys cho TanStack Query
 * Theo chuẩn Next.js 16: chỉ invalidate những queries thực sự cần thiết
 */

import type { QueryClient } from "@tanstack/react-query"

type FilterRecord = Record<string, string | undefined>

/**
 * Normalize filters bằng cách loại bỏ undefined/empty values và sắp xếp keys
 * @param filters - Record chứa filters
 * @returns Normalized filters hoặc undefined nếu không có filters hợp lệ
 */
function normalizeFilters(filters?: FilterRecord): Record<string, string> | undefined {
  if (!filters) return undefined
  
  const normalized: Record<string, string> = {}
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") {
      normalized[key] = value
    }
  }
  
  if (Object.keys(normalized).length === 0) return undefined
  
  // Sắp xếp keys để đảm bảo query key consistency
  const sortedKeys = Object.keys(normalized).sort()
  return sortedKeys.reduce<Record<string, string>>((acc, key) => {
    acc[key] = normalized[key]!
    return acc
  }, {})
}

/**
 * Base interface cho list params với pagination và search
 */
interface BaseListParams {
  page: number
  limit: number
  search?: string
  filters?: Record<string, string>
}

export interface AdminCommentsListParams extends BaseListParams {
  status: "active" | "deleted" | "all"
}

export interface AdminContactRequestsListParams extends BaseListParams {
  status?: "active" | "deleted" | "all"
}

export interface AdminStudentsListParams extends BaseListParams {
  status?: "active" | "deleted" | "all"
}

export interface AdminRolesListParams extends BaseListParams {
  status?: "active" | "deleted" | "all"
}

export interface AdminTagsListParams extends BaseListParams {
  status?: "active" | "deleted" | "all"
}

export interface AdminSessionsListParams extends BaseListParams {
  status?: "active" | "deleted" | "all"
}

export interface AdminCategoriesListParams extends BaseListParams {
  status?: "active" | "deleted" | "all"
}

export interface AdminPostsListParams extends BaseListParams {
  status?: "active" | "deleted" | "all"
}

export interface AdminUsersListParams extends BaseListParams {
  status?: "active" | "deleted" | "all"
}

/**
 * Helper để tạo query key với optional params
 */
function createQueryKey(base: readonly string[], ...params: unknown[]): readonly unknown[] {
  return [...base, ...params.filter(p => p !== undefined)]
}

/**
 * Normalize list params để đảm bảo query key consistency
 */
function normalizeListParams<T extends BaseListParams>(params: T): T {
  return {
    ...params,
    filters: normalizeFilters(params.filters),
  }
}

/**
 * Query Keys Factory Pattern
 * Giúp type-safe và dễ quản lý query keys
 */
export const queryKeys = {
  /**
   * Notification query keys
   */
  notifications: {
    /**
     * User notifications với optional pagination và filters
     * @param userId - User ID
     * @param options - Optional pagination và filter options
     */
    user: (
      userId: string | undefined,
      options?: { limit?: number; offset?: number; unreadOnly?: boolean }
    ): readonly unknown[] => {
      if (!userId) return ["notifications", "user", null]
      return createQueryKey(
        ["notifications", "user", userId],
        options?.limit,
        options?.offset,
        options?.unreadOnly
      )
    },
    /**
     * Admin notifications (Admin Table)
     */
    admin: (): readonly unknown[] => ["notifications", "admin"],
    /**
     * Tất cả user notifications (không phân biệt params)
     * Dùng để invalidate tất cả queries của user
     */
    allUser: (userId: string | undefined): readonly unknown[] => {
      if (!userId) return ["notifications", "user"]
      return ["notifications", "user", userId]
    },
    /**
     * Tất cả admin notifications
     */
    allAdmin: (): readonly unknown[] => ["notifications", "admin"],
  },

  /**
   * User query keys
   */
  users: {
    /**
     * User list với pagination và filters
     */
    list: (params?: {
      page?: number
      limit?: number
      search?: string
      status?: string
    }): readonly unknown[] => {
      if (!params) return ["users", "list"]
      return createQueryKey(
        ["users", "list"],
        params.page,
        params.limit,
        params.search,
        params.status
      )
    },
    /**
     * User detail by ID
     */
    detail: (id: string): readonly unknown[] => ["users", "detail", id],
    /**
     * Tất cả user queries (dùng để invalidate)
     */
    all: (): readonly unknown[] => ["users"],
  },

  /**
   * Admin Users query keys (for admin table)
   */
  adminUsers: {
    /**
     * Tất cả admin users queries
     */
    all: (): readonly unknown[] => ["adminUsers"],
    /**
     * Admin users list với normalized params
     */
    list: (params: AdminUsersListParams): readonly unknown[] => {
      return ["adminUsers", normalizeListParams(params)]
    },
    /**
     * User detail by ID
     */
    detail: (id: string): readonly unknown[] => ["users", "detail", id],
  },

  /**
   * Role query keys
   */
  roles: {
    list: (): readonly unknown[] => ["roles", "list"],
    all: (): readonly unknown[] => ["roles"],
  },

  /**
   * Admin Roles query keys
   */
  adminRoles: {
    /**
     * Tất cả admin roles queries
     */
    all: (): readonly unknown[] => ["adminRoles"],
    /**
     * Admin roles list với normalized params
     */
    list: (params: AdminRolesListParams): readonly unknown[] => {
      return ["adminRoles", normalizeListParams(params)]
    },
    /**
     * Role detail by ID
     */
    detail: (id: string): readonly unknown[] => ["adminRoles", "detail", id],
  },

  /**
   * Unread counts query keys
   */
  unreadCounts: {
    /**
     * Unread counts cho user cụ thể
     */
    user: (userId: string | undefined): readonly unknown[] => {
      if (!userId) return ["unreadCounts", "user", null]
      return ["unreadCounts", "user", userId]
    },
    /**
     * Tất cả unread counts queries
     */
    all: (): readonly unknown[] => ["unreadCounts"],
  },

  /**
   * Admin Comments query keys
   */
  adminComments: {
    /**
     * Tất cả admin comments queries
     */
    all: (): readonly unknown[] => ["adminComments"],
    /**
     * Admin comments list với normalized params
     */
    list: (params: AdminCommentsListParams): readonly unknown[] => {
      return ["adminComments", normalizeListParams(params)]
    },
  },

  /**
   * Admin Contact Requests query keys
   */
  adminContactRequests: {
    /**
     * Tất cả admin contact requests queries
     */
    all: (): readonly unknown[] => ["adminContactRequests"],
    /**
     * Admin contact requests list với normalized params
     */
    list: (params: AdminContactRequestsListParams): readonly unknown[] => {
      return ["adminContactRequests", normalizeListParams(params)]
    },
  },

  /**
   * Admin Students query keys
   */
  adminStudents: {
    /**
     * Tất cả admin students queries
     */
    all: (): readonly unknown[] => ["adminStudents"],
    /**
     * Admin students list với normalized params
     */
    list: (params: AdminStudentsListParams): readonly unknown[] => {
      return ["adminStudents", normalizeListParams(params)]
    },
    /**
     * Student detail by ID
     */
    detail: (id: string): readonly unknown[] => ["adminStudents", "detail", id],
  },

  /**
   * Admin Tags query keys
   */
  adminTags: {
    /**
     * Tất cả admin tags queries
     */
    all: (): readonly unknown[] => ["adminTags"],
    /**
     * Admin tags list với normalized params
     */
    list: (params: AdminTagsListParams): readonly unknown[] => {
      return ["adminTags", normalizeListParams(params)]
    },

    detail: (id: string): readonly unknown[] => ["adminTags", "detail", id],
  },

  /**
   * Admin Sessions query keys
   */
  adminSessions: {
    /**
     * Tất cả admin sessions queries
     */
    all: (): readonly unknown[] => ["adminSessions"],
    /**
     * Admin sessions list với normalized params
     */
    list: (params: AdminSessionsListParams): readonly unknown[] => {
      return ["adminSessions", normalizeListParams(params)]
    },
  },

  /**
   * Admin Categories query keys
   */
  adminCategories: {
    /**
     * Tất cả admin categories queries
     */
    all: (): readonly unknown[] => ["adminCategories"],
    /**
     * Admin categories list với normalized params
     */
    list: (params: AdminCategoriesListParams): readonly unknown[] => {
      return ["adminCategories", normalizeListParams(params)]
    },
    /**
     * Category detail by ID
     */
    detail: (id: string): readonly unknown[] => ["adminCategories", "detail", id],
  },

  /**
   * Admin Posts query keys
   */
  adminPosts: {
    /**
     * Tất cả admin posts queries
     */
    all: (): readonly unknown[] => ["adminPosts"],
    /**
     * Admin posts list với normalized params
     */
    list: (params: AdminPostsListParams): readonly unknown[] => {
      return ["adminPosts", normalizeListParams(params)]
    },
    /**
     * Post detail by ID
     */
    detail: (id: string): readonly unknown[] => ["adminPosts", "detail", id],
  },
} as const

/**
 * Helper functions để invalidate queries một cách chính xác
 * Tuân theo nguyên tắc: chỉ invalidate những queries thực sự cần thiết
 */
export const invalidateQueries = {
  /**
   * Invalidate user notifications
   * @param queryClient - TanStack Query client instance
   * @param userId - User ID cần invalidate
   * @param options - Options cho việc invalidate
   * @param options.exact - Nếu true, chỉ invalidate query chính xác (tiết kiệm tài nguyên hơn)
   *                        Nếu false, invalidate tất cả queries của user (dùng khi không biết params)
   */
  userNotifications: (
    queryClient: QueryClient,
    userId: string | undefined,
    options?: { exact?: boolean }
  ): void => {
    if (!userId) return
    
    const { exact = false } = options ?? {}
    const queryKey = exact
      ? queryKeys.notifications.user(userId)
      : queryKeys.notifications.allUser(userId)
    
    queryClient.invalidateQueries({ queryKey: queryKey as unknown[] })
  },

  /**
   * Invalidate admin notifications
   * Chỉ invalidate admin table queries
   * @param queryClient - TanStack Query client instance
   */
  adminNotifications: (queryClient: QueryClient): void => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.notifications.admin() as unknown[],
    })
  },

  /**
   * Invalidate cả user và admin notifications
   * Chỉ dùng khi thay đổi ảnh hưởng đến cả 2 (ví dụ: xóa notification)
   * @param queryClient - TanStack Query client instance
   * @param userId - User ID cần invalidate
   * @param options - Options cho việc invalidate
   */
  allNotifications: (
    queryClient: QueryClient,
    userId: string | undefined,
    options?: { exact?: boolean }
  ): void => {
    invalidateQueries.userNotifications(queryClient, userId, options)
    invalidateQueries.adminNotifications(queryClient)
  },

  /**
   * Invalidate unread counts
   * Dùng khi notifications hoặc messages được đánh dấu đọc/chưa đọc
   * @param queryClient - TanStack Query client instance
   * @param userId - User ID cần invalidate
   */
  unreadCounts: (queryClient: QueryClient, userId: string | undefined): void => {
    if (!userId) return
    
    queryClient.invalidateQueries({
      queryKey: queryKeys.unreadCounts.user(userId) as unknown[],
    })
  },

  /**
   * Invalidate cả notifications và unread counts
   * Dùng khi mark notification as read/unread để cập nhật cả badge count
   * @param queryClient - TanStack Query client instance
   * @param userId - User ID cần invalidate
   * @param options - Options cho việc invalidate notifications
   */
  notificationsAndCounts: (
    queryClient: QueryClient,
    userId: string | undefined,
    options?: { exact?: boolean }
  ): void => {
    invalidateQueries.allNotifications(queryClient, userId, options)
    invalidateQueries.unreadCounts(queryClient, userId)
  },
} as const

