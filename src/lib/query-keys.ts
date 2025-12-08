/**
 * Query Keys Configuration
 * 
 * Centralized query keys for TanStack Query
 * Follows Next.js 16 + TanStack Query best practices
 */

import type { QueryClient } from "@tanstack/react-query"

type FilterRecord = Record<string, string | undefined>

/**
 * Normalize filters by removing undefined/empty values and sorting keys
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
  
  // Sort keys for query key consistency
  return Object.keys(normalized)
    .sort()
    .reduce<Record<string, string>>((acc, key) => {
      acc[key] = normalized[key]!
      return acc
    }, {})
}

/**
 * Base interface for list params with pagination and search
 */
interface BaseListParams {
  page: number
  limit: number
  search?: string
  filters?: Record<string, string>
  status?: "active" | "deleted" | "all"
}

// Export all list params types (using BaseListParams with optional status)
export type AdminCommentsListParams = BaseListParams & { status: "active" | "deleted" | "all" }
export type AdminContactRequestsListParams = BaseListParams
export type AdminStudentsListParams = BaseListParams
export type AdminRolesListParams = BaseListParams
export type AdminTagsListParams = BaseListParams
export type AdminSessionsListParams = BaseListParams
export type AdminCategoriesListParams = BaseListParams
export type AdminPostsListParams = BaseListParams
export type AdminUsersListParams = BaseListParams
export type AdminProductsListParams = BaseListParams
export type AdminOrdersListParams = BaseListParams

/**
 * Create query key with optional params
 */
function createQueryKey(base: readonly string[], ...params: unknown[]): readonly unknown[] {
  return [...base, ...params.filter((p) => p !== undefined)]
}

/**
 * Normalize list params for query key consistency
 */
function normalizeListParams<T extends BaseListParams>(params: T): T {
  return { ...params, filters: normalizeFilters(params.filters) }
}

/**
 * Factory to create admin resource query keys
 */
function createAdminResourceKeys(resource: string) {
  return {
    all: (): readonly unknown[] => [resource],
    list: (params: BaseListParams): readonly unknown[] => [resource, normalizeListParams(params)],
    detail: (id: string): readonly unknown[] => [resource, "detail", id],
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

  // Admin Roles query keys
  adminRoles: createAdminResourceKeys("adminRoles"),

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

  // Admin resource query keys (using factory pattern)
  adminComments: createAdminResourceKeys("adminComments"),
  adminContactRequests: createAdminResourceKeys("adminContactRequests"),
  adminStudents: createAdminResourceKeys("adminStudents"),
  adminTags: createAdminResourceKeys("adminTags"),
  adminSessions: createAdminResourceKeys("adminSessions"),
  adminCategories: createAdminResourceKeys("adminCategories"),
  adminPosts: createAdminResourceKeys("adminPosts"),
  adminProducts: createAdminResourceKeys("adminProducts"),
  adminOrders: createAdminResourceKeys("adminOrders"),
} as const

/**
 * Query invalidation helpers
 * Follows TanStack Query best practices: only invalidate necessary queries
 */
export const invalidateQueries = {
  /**
   * Invalidate user notifications
   * @param exact - If true, invalidate exact query (more efficient)
   *                 If false, invalidate all user queries (use when params unknown)
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
   */
  adminNotifications: (queryClient: QueryClient): void => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.notifications.admin() as unknown[],
    })
  },

  /**
   * Invalidate both user and admin notifications
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
   */
  unreadCounts: (queryClient: QueryClient, userId: string | undefined): void => {
    if (!userId) return
    queryClient.invalidateQueries({
      queryKey: queryKeys.unreadCounts.user(userId) as unknown[],
    })
  },

  /**
   * Invalidate notifications and unread counts
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

