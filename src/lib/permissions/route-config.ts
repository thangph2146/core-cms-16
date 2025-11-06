/**
 * Route Configuration - Single source of truth cho route permissions
 * Tự động generate CRUD routes để giảm duplicate code
 */

import { PERMISSIONS } from "./permissions"
import type { Permission } from "./permissions"

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

export interface RoutePermissionConfig {
  path: string
  method?: HttpMethod
  permissions: Permission[]
  type: "page" | "api"
}

/**
 * Resource config để tự động generate CRUD routes
 */
interface ResourceConfig {
  name: string
  permissions: {
    view: Permission
    create: Permission
    update: Permission
    delete: Permission
    manage?: Permission
  }
  customPages?: Array<{ path: string; permissions: Permission[] }>
  customApi?: Array<{ path: string; method: HttpMethod; permissions: Permission[] }>
  adminApi?: boolean | Array<{ path: string; method: HttpMethod; permissions: Permission[] }> // Generate /api/admin/{name} routes
}

/**
 * Generate CRUD routes cho một resource
 */
function generateResourceRoutes(config: ResourceConfig): RoutePermissionConfig[] {
  const { name, permissions, customPages = [], customApi = [], adminApi = false } = config
  const routes: RoutePermissionConfig[] = []

  // Page routes
  routes.push(
    { path: `/admin/${name}`, permissions: [permissions.view], type: "page" },
    { path: `/admin/${name}/new`, permissions: [permissions.create], type: "page" },
    { path: `/admin/${name}/[id]`, permissions: [permissions.view], type: "page" },
    { path: `/admin/${name}/[id]/edit`, permissions: [permissions.update], type: "page" },
    ...customPages.map((p) => ({ ...p, type: "page" as const }))
  )

  // API routes
  routes.push(
    { path: `/api/${name}`, method: "GET", permissions: [permissions.view], type: "api" },
    { path: `/api/${name}`, method: "POST", permissions: [permissions.create], type: "api" },
    { path: `/api/${name}/[id]`, method: "GET", permissions: [permissions.view], type: "api" },
    { path: `/api/${name}/[id]`, method: "PUT", permissions: [permissions.update], type: "api" },
    { path: `/api/${name}/[id]`, method: "DELETE", permissions: [permissions.delete], type: "api" },
    ...customApi.map((api) => ({ ...api, type: "api" as const }))
  )

  // Admin API routes
  if (adminApi === true) {
    // Generate default admin API route (GET /api/admin/{name})
    routes.push({
      path: `/api/admin/${name}`,
      method: "GET",
      permissions: [permissions.view],
      type: "api",
    })
  } else if (Array.isArray(adminApi)) {
    // Generate custom admin API routes
    routes.push(
      ...adminApi.map((api) => ({
        path: `/api/admin/${name}${api.path}`,
        method: api.method,
        permissions: api.permissions,
        type: "api" as const,
      }))
    )
  }

  return routes
}

/**
 * Centralized route permissions configuration
 */
export const ROUTE_CONFIG: RoutePermissionConfig[] = [
  // Dashboard
  { path: "/admin/dashboard", permissions: [PERMISSIONS.DASHBOARD_VIEW], type: "page" },
  { path: "/admin/dashboard/stats", permissions: [PERMISSIONS.DASHBOARD_VIEW], type: "page" },

  // Users
  ...generateResourceRoutes({
    name: "users",
    permissions: {
      view: PERMISSIONS.USERS_VIEW,
      create: PERMISSIONS.USERS_CREATE,
      update: PERMISSIONS.USERS_UPDATE,
      delete: PERMISSIONS.USERS_DELETE,
      manage: PERMISSIONS.USERS_MANAGE,
    },
    adminApi: [
      { path: "", method: "GET", permissions: [PERMISSIONS.USERS_VIEW] },
      { path: "", method: "POST", permissions: [PERMISSIONS.USERS_CREATE] },
      { path: "/[id]", method: "GET", permissions: [PERMISSIONS.USERS_VIEW] },
      { path: "/[id]", method: "PUT", permissions: [PERMISSIONS.USERS_UPDATE] },
      { path: "/[id]", method: "DELETE", permissions: [PERMISSIONS.USERS_DELETE] },
      { path: "/bulk", method: "POST", permissions: [PERMISSIONS.USERS_MANAGE] },
      { path: "/[id]/restore", method: "POST", permissions: [PERMISSIONS.USERS_UPDATE] },
      { path: "/[id]/hard-delete", method: "DELETE", permissions: [PERMISSIONS.USERS_MANAGE] },
    ],
  }),

  // Roles
  ...generateResourceRoutes({
    name: "roles",
    permissions: {
      view: PERMISSIONS.ROLES_VIEW,
      create: PERMISSIONS.ROLES_CREATE,
      update: PERMISSIONS.ROLES_UPDATE,
      delete: PERMISSIONS.ROLES_DELETE,
      manage: PERMISSIONS.ROLES_MANAGE,
    },
    customApi: [
      {
        path: "",
        method: "GET",
        permissions: [PERMISSIONS.ROLES_VIEW, PERMISSIONS.USERS_CREATE, PERMISSIONS.USERS_VIEW],
      },
    ],
    adminApi: [
      {
        path: "",
        method: "GET",
        permissions: [PERMISSIONS.ROLES_VIEW, PERMISSIONS.USERS_CREATE, PERMISSIONS.USERS_VIEW],
      },
    ],
  }),

  // Notifications
  { path: "/admin/notifications", permissions: [PERMISSIONS.NOTIFICATIONS_VIEW], type: "page" },
  { path: "/api/notifications", method: "GET", permissions: [PERMISSIONS.NOTIFICATIONS_VIEW], type: "api" },
  { path: "/api/notifications", method: "POST", permissions: [PERMISSIONS.NOTIFICATIONS_MANAGE], type: "api" },
  { path: "/api/notifications/[id]", method: "GET", permissions: [PERMISSIONS.NOTIFICATIONS_VIEW], type: "api" },
  { path: "/api/notifications/[id]", method: "PUT", permissions: [PERMISSIONS.NOTIFICATIONS_MANAGE], type: "api" },
  { path: "/api/notifications/[id]", method: "DELETE", permissions: [PERMISSIONS.NOTIFICATIONS_MANAGE], type: "api" },
  { path: "/api/notifications/mark-all-read", method: "POST", permissions: [PERMISSIONS.NOTIFICATIONS_VIEW], type: "api" },
  { path: "/api/admin/notifications", method: "GET", permissions: [PERMISSIONS.NOTIFICATIONS_VIEW], type: "api" },

  // Posts
  ...generateResourceRoutes({
    name: "posts",
    permissions: {
      view: PERMISSIONS.POSTS_VIEW,
      create: PERMISSIONS.POSTS_CREATE,
      update: PERMISSIONS.POSTS_UPDATE,
      delete: PERMISSIONS.POSTS_DELETE,
      manage: PERMISSIONS.POSTS_MANAGE,
    },
    customPages: [
      { path: "/admin/posts/my-posts", permissions: [PERMISSIONS.POSTS_VIEW] },
      { path: "/admin/posts/published", permissions: [PERMISSIONS.POSTS_PUBLISH] },
    ],
  }),

  // Categories
  ...generateResourceRoutes({
    name: "categories",
    permissions: {
      view: PERMISSIONS.CATEGORIES_VIEW,
      create: PERMISSIONS.CATEGORIES_CREATE,
      update: PERMISSIONS.CATEGORIES_UPDATE,
      delete: PERMISSIONS.CATEGORIES_DELETE,
      manage: PERMISSIONS.CATEGORIES_MANAGE,
    },
  }),

  // Tags
  ...generateResourceRoutes({
    name: "tags",
    permissions: {
      view: PERMISSIONS.TAGS_VIEW,
      create: PERMISSIONS.TAGS_CREATE,
      update: PERMISSIONS.TAGS_UPDATE,
      delete: PERMISSIONS.TAGS_DELETE,
      manage: PERMISSIONS.TAGS_MANAGE,
    },
  }),

  // Comments
  { path: "/admin/comments", permissions: [PERMISSIONS.COMMENTS_VIEW], type: "page" },
  { path: "/admin/comments/pending", permissions: [PERMISSIONS.COMMENTS_APPROVE], type: "page" },
  { path: "/api/comments", method: "GET", permissions: [PERMISSIONS.COMMENTS_VIEW], type: "api" },
  { path: "/api/comments/[id]/approve", method: "POST", permissions: [PERMISSIONS.COMMENTS_APPROVE], type: "api" },
  { path: "/api/comments/[id]", method: "DELETE", permissions: [PERMISSIONS.COMMENTS_DELETE], type: "api" },

  // Messages
  { path: "/admin/messages", permissions: [PERMISSIONS.MESSAGES_VIEW], type: "page" },
  { path: "/admin/messages/inbox", permissions: [PERMISSIONS.MESSAGES_VIEW], type: "page" },
  { path: "/admin/messages/sent", permissions: [PERMISSIONS.MESSAGES_VIEW], type: "page" },

  // Contact Requests
  { path: "/admin/contact-requests", permissions: [PERMISSIONS.CONTACT_REQUESTS_VIEW], type: "page" },
  { path: "/admin/contact-requests/resolved", permissions: [PERMISSIONS.CONTACT_REQUESTS_VIEW], type: "page" },
  { path: "/admin/contact-requests/[id]", permissions: [PERMISSIONS.CONTACT_REQUESTS_VIEW], type: "page" },
  { path: "/admin/contact-requests/[id]/edit", permissions: [PERMISSIONS.CONTACT_REQUESTS_UPDATE], type: "page" },
  { path: "/api/contact-requests", method: "GET", permissions: [PERMISSIONS.CONTACT_REQUESTS_VIEW], type: "api" },
  { path: "/api/contact-requests/[id]", method: "PUT", permissions: [PERMISSIONS.CONTACT_REQUESTS_UPDATE], type: "api" },
  { path: "/api/contact-requests/[id]/assign", method: "POST", permissions: [PERMISSIONS.CONTACT_REQUESTS_ASSIGN], type: "api" },

  // Students
  ...generateResourceRoutes({
    name: "students",
    permissions: {
      view: PERMISSIONS.STUDENTS_VIEW,
      create: PERMISSIONS.STUDENTS_CREATE,
      update: PERMISSIONS.STUDENTS_UPDATE,
      delete: PERMISSIONS.STUDENTS_DELETE,
      manage: PERMISSIONS.STUDENTS_MANAGE,
    },
  }),

  // Settings
  { path: "/admin/settings", permissions: [PERMISSIONS.SETTINGS_VIEW], type: "page" },
  { path: "/admin/settings/general", permissions: [PERMISSIONS.SETTINGS_VIEW], type: "page" },
  { path: "/admin/settings/security", permissions: [PERMISSIONS.SETTINGS_MANAGE], type: "page" },
  { path: "/admin/settings/notifications", permissions: [PERMISSIONS.SETTINGS_VIEW], type: "page" },
  { path: "/api/settings", method: "GET", permissions: [PERMISSIONS.SETTINGS_VIEW], type: "api" },
  { path: "/api/settings", method: "PUT", permissions: [PERMISSIONS.SETTINGS_UPDATE], type: "api" },
]
