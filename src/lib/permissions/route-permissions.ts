/**
 * Route Permissions Mapping
 * 
 * Map route paths với required permissions để check quyền truy cập
 * Sử dụng ở layout level để check permission trực tiếp mà không cần check từng page
 */

import { PERMISSIONS } from "./permissions"
import type { Permission } from "./permissions"

/**
 * Route permissions mapping
 * Key là route pattern (có thể sử dụng exact match hoặc prefix match)
 * Value là required permissions để truy cập route đó
 */
export const ROUTE_PERMISSIONS: Record<string, Permission[]> = {
  // Dashboard routes
  "/admin/dashboard": [PERMISSIONS.DASHBOARD_VIEW],
  "/admin/dashboard/stats": [PERMISSIONS.DASHBOARD_VIEW],

  // Users routes
  "/admin/users": [PERMISSIONS.USERS_VIEW],
  "/admin/users/new": [PERMISSIONS.USERS_CREATE],
  "/admin/users/[id]": [PERMISSIONS.USERS_VIEW],
  "/admin/users/[id]/edit": [PERMISSIONS.USERS_UPDATE],
  "/admin/users/roles": [PERMISSIONS.USERS_MANAGE],

  // Posts routes
  "/admin/posts": [PERMISSIONS.POSTS_VIEW],
  "/admin/posts/new": [PERMISSIONS.POSTS_CREATE],
  "/admin/posts/my-posts": [PERMISSIONS.POSTS_VIEW],
  "/admin/posts/published": [PERMISSIONS.POSTS_PUBLISH],
  "/admin/posts/[id]": [PERMISSIONS.POSTS_VIEW],
  "/admin/posts/[id]/edit": [PERMISSIONS.POSTS_UPDATE],

  // Categories routes
  "/admin/categories": [PERMISSIONS.CATEGORIES_VIEW],
  "/admin/categories/new": [PERMISSIONS.CATEGORIES_CREATE],
  "/admin/categories/[id]": [PERMISSIONS.CATEGORIES_VIEW],
  "/admin/categories/[id]/edit": [PERMISSIONS.CATEGORIES_UPDATE],

  // Tags routes
  "/admin/tags": [PERMISSIONS.TAGS_VIEW],
  "/admin/tags/new": [PERMISSIONS.TAGS_CREATE],
  "/admin/tags/[id]": [PERMISSIONS.TAGS_VIEW],
  "/admin/tags/[id]/edit": [PERMISSIONS.TAGS_UPDATE],

  // Comments routes
  "/admin/comments": [PERMISSIONS.COMMENTS_VIEW],
  "/admin/comments/pending": [PERMISSIONS.COMMENTS_APPROVE],

  // Roles routes
  "/admin/roles": [PERMISSIONS.ROLES_VIEW],
  "/admin/roles/new": [PERMISSIONS.ROLES_CREATE],
  "/admin/roles/[id]": [PERMISSIONS.ROLES_VIEW],
  "/admin/roles/[id]/edit": [PERMISSIONS.ROLES_UPDATE],

  // Messages routes
  "/admin/messages": [PERMISSIONS.MESSAGES_VIEW],
  "/admin/messages/inbox": [PERMISSIONS.MESSAGES_VIEW],
  "/admin/messages/sent": [PERMISSIONS.MESSAGES_VIEW],

  // Notifications routes
  "/admin/notifications": [PERMISSIONS.NOTIFICATIONS_VIEW],

  // Contact requests routes
  "/admin/contact-requests": [PERMISSIONS.CONTACT_REQUESTS_VIEW],
  "/admin/contact-requests/resolved": [PERMISSIONS.CONTACT_REQUESTS_VIEW],
  "/admin/contact-requests/[id]": [PERMISSIONS.CONTACT_REQUESTS_VIEW],
  "/admin/contact-requests/[id]/edit": [PERMISSIONS.CONTACT_REQUESTS_UPDATE],

  // Students routes
  "/admin/students": [PERMISSIONS.STUDENTS_VIEW],
  "/admin/students/new": [PERMISSIONS.STUDENTS_CREATE],
  "/admin/students/[id]": [PERMISSIONS.STUDENTS_VIEW],
  "/admin/students/[id]/edit": [PERMISSIONS.STUDENTS_UPDATE],

  // Settings routes
  "/admin/settings": [PERMISSIONS.SETTINGS_VIEW],
  "/admin/settings/general": [PERMISSIONS.SETTINGS_VIEW],
  "/admin/settings/security": [PERMISSIONS.SETTINGS_MANAGE],
  "/admin/settings/notifications": [PERMISSIONS.SETTINGS_VIEW],
}

/**
 * Get required permissions for a route path
 * 
 * @param pathname - Route pathname (e.g., "/admin/users" hoặc "/admin/users/123/edit")
 * @returns Array of required permissions, hoặc empty array nếu không có mapping
 */
export function getRoutePermissions(pathname: string): Permission[] {
  // Normalize pathname: remove trailing slash, remove query params
  const normalized = pathname.split("?")[0].replace(/\/$/, "") || "/"

  // Try exact match first
  if (ROUTE_PERMISSIONS[normalized]) {
    return ROUTE_PERMISSIONS[normalized]
  }

  // Try pattern matching với dynamic segments ([id])
  // Ví dụ: "/admin/users/123" sẽ match với "/admin/users/[id]"
  for (const [pattern, permissions] of Object.entries(ROUTE_PERMISSIONS)) {
    // Convert pattern to regex
    // "/admin/users/[id]" -> "^/admin/users/[^/]+$"
    const regexPattern = pattern
      .replace(/\[([^\]]+)\]/g, "[^/]+") // Replace [id] with [^/]+
      .replace(/\//g, "\\/") // Escape forward slashes
    const regex = new RegExp(`^${regexPattern}$`)

    if (regex.test(normalized)) {
      return permissions
    }
  }

  // Try prefix matching cho nested routes
  // Ví dụ: "/admin/users/123/edit" sẽ match với "/admin/users/[id]/edit"
  // Hoặc có thể match với parent route nếu không tìm thấy exact match
  const pathSegments = normalized.split("/")
  for (let i = pathSegments.length; i > 0; i--) {
    const prefix = pathSegments.slice(0, i).join("/")
    
    // Try exact match với prefix
    if (ROUTE_PERMISSIONS[prefix]) {
      return ROUTE_PERMISSIONS[prefix]
    }

    // Try pattern matching với prefix
    for (const [pattern, permissions] of Object.entries(ROUTE_PERMISSIONS)) {
      const patternSegments = pattern.split("/")
      
      // Check if pattern matches prefix structure
      if (patternSegments.length === i) {
        const regexPattern = pattern
          .replace(/\[([^\]]+)\]/g, "[^/]+")
          .replace(/\//g, "\\/")
        const regex = new RegExp(`^${regexPattern}$`)

        if (regex.test(prefix)) {
          return permissions
        }
      }
    }
  }

  // No match found, return empty array (no permission required)
  return []
}

/**
 * Check if a pathname requires any permissions
 */
export function requiresPermission(pathname: string): boolean {
  return getRoutePermissions(pathname).length > 0
}

