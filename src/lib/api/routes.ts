/**
 * API Routes Configuration
 * 
 * Tập trung quản lý tất cả API routes cho toàn hệ thống
 * Theo chuẩn Next.js 16: type-safe và dễ maintain
 * 
 * LƯU Ý: Không include `/api` prefix vì `apiClient` đã có `baseURL: "/api"`
 * Nếu sử dụng trực tiếp với fetch/axios khác, cần thêm `/api` prefix
 */

/**
 * API Routes cho từng feature
 * Không include `/api` prefix vì apiClient đã có baseURL
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

  // Users
  users: {
    list: (params?: { page?: number; limit?: number; search?: string; status?: string }) => {
      const searchParams = new URLSearchParams()
      if (params?.page) searchParams.set("page", params.page.toString())
      if (params?.limit) searchParams.set("limit", params.limit.toString())
      if (params?.search) searchParams.set("search", params.search)
      if (params?.status) searchParams.set("status", params.status)
      const queryString = searchParams.toString()
      return `/admin/users${queryString ? `?${queryString}` : ""}`
    },
    detail: (id: string) => `/admin/users/${id}`,
    create: "/admin/users",
    update: (id: string) => `/admin/users/${id}`,
    delete: (id: string) => `/admin/users/${id}`,
    restore: (id: string) => `/admin/users/${id}/restore`,
    hardDelete: (id: string) => `/admin/users/${id}/hard-delete`,
    bulk: "/admin/users/bulk",
    options: (params?: { column: string; search?: string; limit?: number }) => {
      const searchParams = new URLSearchParams()
      if (params?.column) searchParams.set("column", params.column)
      if (params?.search) searchParams.set("search", params.search)
      if (params?.limit) searchParams.set("limit", params.limit.toString())
      const queryString = searchParams.toString()
      return `/admin/users/options${queryString ? `?${queryString}` : ""}`
    },
  },

  // Roles
  roles: {
    list: (params?: { page?: number; limit?: number; search?: string; status?: string }) => {
      const searchParams = new URLSearchParams()
      if (params?.page) searchParams.set("page", params.page.toString())
      if (params?.limit) searchParams.set("limit", params.limit.toString())
      if (params?.search) searchParams.set("search", params.search)
      if (params?.status) searchParams.set("status", params.status)
      const queryString = searchParams.toString()
      return `/admin/roles${queryString ? `?${queryString}` : ""}`
    },
    detail: (id: string) => `/admin/roles/${id}`,
    create: "/admin/roles",
    update: (id: string) => `/admin/roles/${id}`,
    delete: (id: string) => `/admin/roles/${id}`,
    restore: (id: string) => `/admin/roles/${id}/restore`,
    hardDelete: (id: string) => `/admin/roles/${id}/hard-delete`,
    bulk: "/admin/roles/bulk",
    options: (params?: { column: string; search?: string; limit?: number }) => {
      const searchParams = new URLSearchParams()
      if (params?.column) searchParams.set("column", params.column)
      if (params?.search) searchParams.set("search", params.search)
      if (params?.limit) searchParams.set("limit", params.limit.toString())
      const queryString = searchParams.toString()
      return `/admin/roles/options${queryString ? `?${queryString}` : ""}`
    },
  },

  // Categories
  categories: {
    list: (params?: { page?: number; limit?: number; search?: string; status?: string }) => {
      const searchParams = new URLSearchParams()
      if (params?.page) searchParams.set("page", params.page.toString())
      if (params?.limit) searchParams.set("limit", params.limit.toString())
      if (params?.search) searchParams.set("search", params.search)
      if (params?.status) searchParams.set("status", params.status)
      const queryString = searchParams.toString()
      return `/admin/categories${queryString ? `?${queryString}` : ""}`
    },
    detail: (id: string) => `/admin/categories/${id}`,
    create: "/admin/categories",
    update: (id: string) => `/admin/categories/${id}`,
    delete: (id: string) => `/admin/categories/${id}`,
    restore: (id: string) => `/admin/categories/${id}/restore`,
    hardDelete: (id: string) => `/admin/categories/${id}/hard-delete`,
    bulk: "/admin/categories/bulk",
    options: (params?: { column: string; search?: string; limit?: number }) => {
      const searchParams = new URLSearchParams()
      if (params?.column) searchParams.set("column", params.column)
      if (params?.search) searchParams.set("search", params.search)
      if (params?.limit) searchParams.set("limit", params.limit.toString())
      const queryString = searchParams.toString()
      return `/admin/categories/options${queryString ? `?${queryString}` : ""}`
    },
  },

  // Tags
  tags: {
    list: (params?: { page?: number; limit?: number; search?: string; status?: string }) => {
      const searchParams = new URLSearchParams()
      if (params?.page) searchParams.set("page", params.page.toString())
      if (params?.limit) searchParams.set("limit", params.limit.toString())
      if (params?.search) searchParams.set("search", params.search)
      if (params?.status) searchParams.set("status", params.status)
      const queryString = searchParams.toString()
      return `/admin/tags${queryString ? `?${queryString}` : ""}`
    },
    detail: (id: string) => `/admin/tags/${id}`,
    create: "/admin/tags",
    update: (id: string) => `/admin/tags/${id}`,
    delete: (id: string) => `/admin/tags/${id}`,
    restore: (id: string) => `/admin/tags/${id}/restore`,
    hardDelete: (id: string) => `/admin/tags/${id}/hard-delete`,
    bulk: "/admin/tags/bulk",
    options: (params?: { column: string; search?: string; limit?: number }) => {
      const searchParams = new URLSearchParams()
      if (params?.column) searchParams.set("column", params.column)
      if (params?.search) searchParams.set("search", params.search)
      if (params?.limit) searchParams.set("limit", params.limit.toString())
      const queryString = searchParams.toString()
      return `/admin/tags/options${queryString ? `?${queryString}` : ""}`
    },
  },

  // Contact Requests
  contactRequests: {
    list: (params?: { page?: number; limit?: number; search?: string; status?: string }) => {
      const searchParams = new URLSearchParams()
      if (params?.page) searchParams.set("page", params.page.toString())
      if (params?.limit) searchParams.set("limit", params.limit.toString())
      if (params?.search) searchParams.set("search", params.search)
      if (params?.status) searchParams.set("status", params.status)
      const queryString = searchParams.toString()
      return `/admin/contact-requests${queryString ? `?${queryString}` : ""}`
    },
    detail: (id: string) => `/admin/contact-requests/${id}`,
    update: (id: string) => `/admin/contact-requests/${id}`,
    assign: (id: string) => `/admin/contact-requests/${id}/assign`,
    delete: (id: string) => `/admin/contact-requests/${id}`,
    restore: (id: string) => `/admin/contact-requests/${id}/restore`,
    hardDelete: (id: string) => `/admin/contact-requests/${id}/hard-delete`,
    bulk: "/admin/contact-requests/bulk",
    options: (params?: { column: string; search?: string; limit?: number }) => {
      const searchParams = new URLSearchParams()
      if (params?.column) searchParams.set("column", params.column)
      if (params?.search) searchParams.set("search", params.search)
      if (params?.limit) searchParams.set("limit", params.limit.toString())
      const queryString = searchParams.toString()
      return `/admin/contact-requests/options${queryString ? `?${queryString}` : ""}`
    },
  },

  // Students
  students: {
    list: (params?: { page?: number; limit?: number; search?: string; status?: string }) => {
      const searchParams = new URLSearchParams()
      if (params?.page) searchParams.set("page", params.page.toString())
      if (params?.limit) searchParams.set("limit", params.limit.toString())
      if (params?.search) searchParams.set("search", params.search)
      if (params?.status) searchParams.set("status", params.status)
      const queryString = searchParams.toString()
      return `/admin/students${queryString ? `?${queryString}` : ""}`
    },
    detail: (id: string) => `/admin/students/${id}`,
    create: "/admin/students",
    update: (id: string) => `/admin/students/${id}`,
    delete: (id: string) => `/admin/students/${id}`,
    restore: (id: string) => `/admin/students/${id}/restore`,
    hardDelete: (id: string) => `/admin/students/${id}/hard-delete`,
    bulk: "/admin/students/bulk",
    options: (params?: { column: string; search?: string; limit?: number }) => {
      const searchParams = new URLSearchParams()
      if (params?.column) searchParams.set("column", params.column)
      if (params?.search) searchParams.set("search", params.search)
      if (params?.limit) searchParams.set("limit", params.limit.toString())
      const queryString = searchParams.toString()
      return `/admin/students/options${queryString ? `?${queryString}` : ""}`
    },
  },

  // Sessions
  sessions: {
    list: (params?: { page?: number; limit?: number; search?: string; status?: string }) => {
      const searchParams = new URLSearchParams()
      if (params?.page) searchParams.set("page", params.page.toString())
      if (params?.limit) searchParams.set("limit", params.limit.toString())
      if (params?.search) searchParams.set("search", params.search)
      if (params?.status) searchParams.set("status", params.status)
      const queryString = searchParams.toString()
      return `/admin/sessions${queryString ? `?${queryString}` : ""}`
    },
    detail: (id: string) => `/admin/sessions/${id}`,
    create: "/admin/sessions",
    update: (id: string) => `/admin/sessions/${id}`,
    delete: (id: string) => `/admin/sessions/${id}`,
    restore: (id: string) => `/admin/sessions/${id}/restore`,
    hardDelete: (id: string) => `/admin/sessions/${id}/hard-delete`,
    bulk: "/admin/sessions/bulk",
    options: (params?: { column: string; search?: string; limit?: number }) => {
      const searchParams = new URLSearchParams()
      if (params?.column) searchParams.set("column", params.column)
      if (params?.search) searchParams.set("search", params.search)
      if (params?.limit) searchParams.set("limit", params.limit.toString())
      const queryString = searchParams.toString()
      return `/admin/sessions/options${queryString ? `?${queryString}` : ""}`
    },
  },

  // Socket
  socket: "/socket",
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

