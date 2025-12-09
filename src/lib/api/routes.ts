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
  
  // Explicitly add resource routes to ensure TypeScript recognizes them
  categories: getResourceRoutesOrFallback("categories", "categories"),
  posts: getResourceRoutesOrFallback("posts", "posts"),
  roles: getResourceRoutesOrFallback("roles", "roles"),
  sessions: getResourceRoutesOrFallback("sessions", "sessions"),
  users: getResourceRoutesOrFallback("users", "users"),
  students: getResourceRoutesOrFallback("students", "students"),
  tags: getResourceRoutesOrFallback("tags", "tags"),
  products: {
    ...getResourceRoutesOrFallback("products", "products"),
    setPrimaryImage: (productId: string, imageId: string) => 
      `/admin/products/${productId}/images/${imageId}/set-primary`,
  },
  orders: getResourceRoutesOrFallback("orders", "orders"),
  
  // Accounts - Personal account management
  accounts: {
    get: "/admin/accounts",
    update: "/admin/accounts",
  },

  // Unread counts
  unreadCounts: {
    get: "/admin/unread-counts",
  },

  // Auth
  auth: {
    signIn: "/auth/sign-in",
    signUp: "/auth/signup",
    signOut: "/auth/sign-out",
    session: "/auth/session", // NextAuth.js built-in endpoint
    createSession: "/auth/create-session", // Custom endpoint để tạo Session record
  },

  // Notifications
  notifications: {
    // User notifications
    list: (params?: { limit?: number; offset?: number; unreadOnly?: boolean }) =>
      withQuery("/notifications", {
        limit: params?.limit,
        offset: params?.offset,
        unreadOnly: params?.unreadOnly,
      }),
    detail: (id: string) => `/notifications/${id}`,
    markRead: (id: string) => `/notifications/${id}`,
    markAllRead: "/notifications/mark-all-read",
    bulk: "/notifications/bulk",
    delete: (id: string) => `/notifications/${id}`,
    deleteAll: "/notifications",
  },

  // Admin Notifications
  adminNotifications: {
    list: (params?: { page?: number; limit?: number; search?: string }) =>
      withQuery("/admin/notifications", params),
    options: (params?: { column: string; search?: string; limit?: number }) =>
      withQuery("/admin/notifications/options", params),
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
      return withQuery(route, {
        page: params?.page,
        limit: params?.limit,
        search: params?.search,
        otherUserId: params?.otherUserId,
      })
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
      return withQuery(route, { q: query })
    },
  },
  // Groups - Chat groups
  adminGroups: {
    create: "/admin/groups",
    list: (params?: { page?: number; limit?: number; search?: string }) =>
      withQuery("/admin/groups", params),
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

  // Uploads
  uploads: {
    upload: "/admin/uploads",
    list: "/admin/uploads",
    delete: "/admin/uploads",
    deleteFolder: "/admin/uploads",
    createFolder: "/admin/uploads",
  },

  // Public Products
  publicProducts: {
    list: (params?: { page?: number; limit?: number; search?: string; category?: string; featured?: boolean; sortBy?: string }) =>
      withQuery("/public/products", params),
    detail: (slug: string) => `/public/products/${slug}`,
  },

  // Public Cart
  publicCart: {
    get: "/public/cart",
    clear: "/public/cart",
    addItem: "/public/cart/items",
    updateItem: (id: string) => `/public/cart/items/${id}`,
    removeItem: (id: string) => `/public/cart/items/${id}`,
  },

  // Public Checkout
  publicCheckout: {
    create: "/public/checkout",
    userInfo: "/public/checkout/user-info",
  },

  // Public Gift Code
  publicGiftCode: {
    validate: "/public/gift-code/validate",
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

export function withQuery(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
): string {
  if (!params) return path
  const queryString = buildQueryString(params)
  return queryString ? `${path}?${queryString}` : path
}
