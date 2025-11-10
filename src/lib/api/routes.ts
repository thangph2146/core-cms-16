/**
 * API Routes Configuration
 * 
 * Tập trung quản lý tất cả API routes cho toàn hệ thống
 * Theo chuẩn Next.js 16: type-safe và dễ maintain
 * 
 * LƯU Ý: Không include `/api` prefix vì `apiClient` đã có `baseURL: "/api"`
 * Nếu sử dụng trực tiếp với fetch/axios khác, cần thêm `/api` prefix
 * 
 * Admin resources sử dụng routes từ route-config.ts để đảm bảo consistency
 */

import { generateResourceApiRoutes, getResourceApiRoute, getResourceAdminApiRoutes } from "@/lib/permissions/api-route-helpers"

/**
 * API Routes cho từng feature
 * Không include `/api` prefix vì apiClient đã có baseURL
 * Admin resources được generate từ route-config.ts
 */
export const apiRoutes = {
  // Auth
  auth: {
    signIn: "/auth/sign-in",
    signUp: "/auth/signup",
    signOut: "/auth/sign-out",
    session: "/auth/session",
  },

  // Notifications
  notifications: {
    // User notifications
    list: (params?: { limit?: number; offset?: number; unreadOnly?: boolean }) => {
      const searchParams = new URLSearchParams()
      if (params?.limit) searchParams.set("limit", params.limit.toString())
      if (params?.offset) searchParams.set("offset", params.offset.toString())
      if (params?.unreadOnly !== undefined) searchParams.set("unreadOnly", params.unreadOnly.toString())
      const queryString = searchParams.toString()
      return `/notifications${queryString ? `?${queryString}` : ""}`
    },
    detail: (id: string) => `/notifications/${id}`,
    markRead: (id: string) => `/notifications/${id}`,
    markAllRead: "/notifications/mark-all-read",
    delete: (id: string) => `/notifications/${id}`,
    deleteAll: "/notifications",
  },

  // Admin Notifications
  adminNotifications: {
    list: (params?: { page?: number; limit?: number; search?: string }) => {
      const searchParams = new URLSearchParams()
      if (params?.page) searchParams.set("page", params.page.toString())
      if (params?.limit) searchParams.set("limit", params.limit.toString())
      if (params?.search) searchParams.set("search", params.search)
      const queryString = searchParams.toString()
      return `/admin/notifications${queryString ? `?${queryString}` : ""}`
    },
    options: (params?: { column: string; search?: string; limit?: number }) => {
      const searchParams = new URLSearchParams()
      if (params?.column) searchParams.set("column", params.column)
      if (params?.search) searchParams.set("search", params.search)
      if (params?.limit) searchParams.set("limit", params.limit.toString())
      const queryString = searchParams.toString()
      return `/admin/notifications/options${queryString ? `?${queryString}` : ""}`
    },
  },

  // Users - Generated from route-config.ts
  users: generateResourceApiRoutes("users"),

  // Roles - Generated from route-config.ts
  roles: generateResourceApiRoutes("roles"),

  // Categories - Generated from route-config.ts
  categories: generateResourceApiRoutes("categories"),

  // Tags - Generated from route-config.ts
  tags: generateResourceApiRoutes("tags"),

  // Contact Requests - Generated from route-config.ts với custom actions
  contactRequests: {
    ...generateResourceApiRoutes("contact-requests"),
    assign: (id: string) => getResourceApiRoute("contact-requests", "POST", "assign")?.replace("[id]", id) || `/admin/contact-requests/${id}/assign`,
  },

  // Students - Generated from route-config.ts
  students: generateResourceApiRoutes("students"),

  // Sessions - Generated from route-config.ts
  sessions: generateResourceApiRoutes("sessions"),

  // Comments - Generated from route-config.ts với custom actions (approve/unapprove)
  comments: {
    ...generateResourceApiRoutes("comments"),
    approve: (id: string) => getResourceApiRoute("comments", "POST", "approve")?.replace("[id]", id) || `/admin/comments/${id}/approve`,
    unapprove: (id: string) => getResourceApiRoute("comments", "POST", "unapprove")?.replace("[id]", id) || `/admin/comments/${id}/unapprove`,
  },

  // Socket
  socket: "/socket",

  // Chat/Messages - Admin routes (sử dụng routes từ route-config)
  adminMessages: {
    send: getResourceApiRoute("messages", "POST", "send") || "/admin/messages",
    markRead: (id: string) => `/admin/messages/${id}`,
    softDelete: (id: string) => `/admin/messages/${id}/soft-delete`,
    hardDelete: (id: string) => `/admin/messages/${id}/hard-delete`,
    restore: (id: string) => `/admin/messages/${id}/restore`,
  },
  adminConversations: {
    list: (params?: { page?: number; limit?: number; search?: string; otherUserId?: string }) => {
      // Get route từ route-config
      const routes = getResourceAdminApiRoutes("conversations")
      const route = routes.find((r: { method?: string; path: string }) => r.method === "GET")?.path.replace("/api", "") || "/admin/conversations"
      const searchParams = new URLSearchParams()
      if (params?.page) searchParams.set("page", params.page.toString())
      if (params?.limit) searchParams.set("limit", params.limit.toString())
      if (params?.search) searchParams.set("search", params.search)
      if (params?.otherUserId) searchParams.set("otherUserId", params.otherUserId)
      const queryString = searchParams.toString()
      return `${route}${queryString ? `?${queryString}` : ""}`
    },
  },
  adminUsers: {
    ...generateResourceApiRoutes("users"),
    search: (query: string) => {
      // Get route từ route-config
      const routes = getResourceAdminApiRoutes("users")
      const route = routes.find((r: { path: string }) => r.path.includes("/search"))?.path.replace("/api", "") || "/admin/users/search"
      return `${route}?q=${encodeURIComponent(query)}`
    },
  },
  // Groups - Chat groups
  adminGroups: {
    create: "/admin/groups",
    list: (params?: { page?: number; limit?: number; search?: string }) => {
      const searchParams = new URLSearchParams()
      if (params?.page) searchParams.set("page", params.page.toString())
      if (params?.limit) searchParams.set("limit", params.limit.toString())
      if (params?.search) searchParams.set("search", params.search)
      const queryString = searchParams.toString()
      return `/admin/groups${queryString ? `?${queryString}` : ""}`
    },
    detail: (id: string) => `/admin/groups/${id}`,
    update: (id: string) => `/admin/groups/${id}`,
    delete: (id: string) => `/admin/groups/${id}`,
    hardDelete: (id: string) => `/admin/groups/${id}/hard-delete`,
    restore: (id: string) => `/admin/groups/${id}/restore`,
    addMembers: (id: string) => `/admin/groups/${id}/members`,
    removeMember: (id: string, userId: string) => `/admin/groups/${id}/members/${userId}`,
    updateMemberRole: (id: string, userId: string) => `/admin/groups/${id}/members/${userId}/role`,
  },
} as const

/**
 * Helper để build query string từ params
 */
export function buildQueryString(params: Record<string, string | number | boolean | undefined>): string {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value))
    }
  })
  return searchParams.toString()
}

