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

import { appFeatures } from "@/lib/config/app-features"
import { prismaResourceMap } from "@/lib/config/resource-map"
import { stripApiBase } from "@/lib/config/api-paths"
import { generateResourceApiRoutes, getResourceApiRoute, getResourceAdminApiRoutes } from "@/lib/permissions/api-route-helpers"

type ResourceRouteBuilder = ReturnType<typeof generateResourceApiRoutes>

const featureResourceRoutes = appFeatures.reduce<Record<string, ResourceRouteBuilder>>((acc, feature) => {
  if (feature.api?.type !== "resource") {
    return acc
  }
  const resourceName = feature.api.resourceName ?? feature.key
  const alias = feature.api.alias ?? feature.key
  acc[alias] = generateResourceApiRoutes(resourceName)
  return acc
}, {})

const getResourceRoutesOrFallback = (key: string, resourceName: string): ResourceRouteBuilder => {
  return featureResourceRoutes[key] ?? generateResourceApiRoutes(resourceName)
}

const prismaResourceRoutes = prismaResourceMap.reduce<Record<string, ResourceRouteBuilder>>((acc, resource) => {
  if (resource.enabled === false) {
    return acc
  }
  acc[resource.key] = getResourceRoutesOrFallback(resource.key, resource.resourceName)
  return acc
}, {})

/**
 * API Routes cho từng feature
 * Không include `/api` prefix vì apiClient đã có baseURL
 * Admin resources được generate từ route-config.ts
 */
export const apiRoutes = {
  // Resource routes driven by Prisma schema + route-config
  ...featureResourceRoutes,
  ...prismaResourceRoutes,

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

  // Contact Requests - thêm custom actions
  contactRequests: {
    ...getResourceRoutesOrFallback("contactRequests", "contact-requests"),
    assign: (id: string) => getResourceApiRoute("contact-requests", "POST", "assign")?.replace("[id]", id) || `/admin/contact-requests/${id}/assign`,
  },

  // Comments - thêm approve/unapprove
  comments: {
    ...getResourceRoutesOrFallback("comments", "comments"),
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
      const adminRoute = routes.find((r: { method?: string; path: string }) => r.method === "GET")?.path
      const route = adminRoute ? stripApiBase(adminRoute) : "/admin/conversations"
      const searchParams = new URLSearchParams()
      if (params?.page) searchParams.set("page", params.page.toString())
      if (params?.limit) searchParams.set("limit", params.limit.toString())
      if (params?.search) searchParams.set("search", params.search)
      if (params?.otherUserId) searchParams.set("otherUserId", params.otherUserId)
      const queryString = searchParams.toString()
      return `${route}${queryString ? `?${queryString}` : ""}`
    },
    markRead: (otherUserId: string) => `/admin/conversations/${otherUserId}/mark-read`,
  },
  adminUsers: {
    ...generateResourceApiRoutes("users"),
    search: (query: string) => {
      // Get route từ route-config
      const routes = getResourceAdminApiRoutes("users")
      const adminRoute = routes.find((r: { path: string }) => r.path.includes("/search"))?.path
      const route = adminRoute ? stripApiBase(adminRoute) : "/admin/users/search"
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
    markRead: (id: string) => `/admin/groups/${id}/mark-read`,
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
