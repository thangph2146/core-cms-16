/**
 * Permission System
 * Định nghĩa các permissions cho từng resource và action
 */

// Resource types
export const RESOURCES = {
  DASHBOARD: "dashboard",
  USERS: "users",
  POSTS: "posts",
  CATEGORIES: "categories",
  TAGS: "tags",
  COMMENTS: "comments",
  ROLES: "roles",
  MESSAGES: "messages",
  NOTIFICATIONS: "notifications",
  CONTACT_REQUESTS: "contact_requests",
  STUDENTS: "students",
  SETTINGS: "settings",
} as const

// Action types
export const ACTIONS = {
  VIEW: "view",
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete",
  PUBLISH: "publish",
  APPROVE: "approve",
  ASSIGN: "assign",
  MANAGE: "manage",
} as const

// Permission format: resource:action
export type Permission = `${(typeof RESOURCES)[keyof typeof RESOURCES]}:${(typeof ACTIONS)[keyof typeof ACTIONS]}`

// Danh sách permissions cho từng resource
export const PERMISSIONS = {
  // Dashboard
  DASHBOARD_VIEW: `${RESOURCES.DASHBOARD}:${ACTIONS.VIEW}` as Permission,

  // Users
  USERS_VIEW: `${RESOURCES.USERS}:${ACTIONS.VIEW}` as Permission,
  USERS_CREATE: `${RESOURCES.USERS}:${ACTIONS.CREATE}` as Permission,
  USERS_UPDATE: `${RESOURCES.USERS}:${ACTIONS.UPDATE}` as Permission,
  USERS_DELETE: `${RESOURCES.USERS}:${ACTIONS.DELETE}` as Permission,
  USERS_MANAGE: `${RESOURCES.USERS}:${ACTIONS.MANAGE}` as Permission,

  // Posts
  POSTS_VIEW: `${RESOURCES.POSTS}:${ACTIONS.VIEW}` as Permission,
  POSTS_CREATE: `${RESOURCES.POSTS}:${ACTIONS.CREATE}` as Permission,
  POSTS_UPDATE: `${RESOURCES.POSTS}:${ACTIONS.UPDATE}` as Permission,
  POSTS_DELETE: `${RESOURCES.POSTS}:${ACTIONS.DELETE}` as Permission,
  POSTS_PUBLISH: `${RESOURCES.POSTS}:${ACTIONS.PUBLISH}` as Permission,
  POSTS_MANAGE: `${RESOURCES.POSTS}:${ACTIONS.MANAGE}` as Permission,

  // Categories
  CATEGORIES_VIEW: `${RESOURCES.CATEGORIES}:${ACTIONS.VIEW}` as Permission,
  CATEGORIES_CREATE: `${RESOURCES.CATEGORIES}:${ACTIONS.CREATE}` as Permission,
  CATEGORIES_UPDATE: `${RESOURCES.CATEGORIES}:${ACTIONS.UPDATE}` as Permission,
  CATEGORIES_DELETE: `${RESOURCES.CATEGORIES}:${ACTIONS.DELETE}` as Permission,
  CATEGORIES_MANAGE: `${RESOURCES.CATEGORIES}:${ACTIONS.MANAGE}` as Permission,

  // Tags
  TAGS_VIEW: `${RESOURCES.TAGS}:${ACTIONS.VIEW}` as Permission,
  TAGS_CREATE: `${RESOURCES.TAGS}:${ACTIONS.CREATE}` as Permission,
  TAGS_UPDATE: `${RESOURCES.TAGS}:${ACTIONS.UPDATE}` as Permission,
  TAGS_DELETE: `${RESOURCES.TAGS}:${ACTIONS.DELETE}` as Permission,
  TAGS_MANAGE: `${RESOURCES.TAGS}:${ACTIONS.MANAGE}` as Permission,

  // Comments
  COMMENTS_VIEW: `${RESOURCES.COMMENTS}:${ACTIONS.VIEW}` as Permission,
  COMMENTS_APPROVE: `${RESOURCES.COMMENTS}:${ACTIONS.APPROVE}` as Permission,
  COMMENTS_DELETE: `${RESOURCES.COMMENTS}:${ACTIONS.DELETE}` as Permission,
  COMMENTS_MANAGE: `${RESOURCES.COMMENTS}:${ACTIONS.MANAGE}` as Permission,

  // Roles
  ROLES_VIEW: `${RESOURCES.ROLES}:${ACTIONS.VIEW}` as Permission,
  ROLES_CREATE: `${RESOURCES.ROLES}:${ACTIONS.CREATE}` as Permission,
  ROLES_UPDATE: `${RESOURCES.ROLES}:${ACTIONS.UPDATE}` as Permission,
  ROLES_DELETE: `${RESOURCES.ROLES}:${ACTIONS.DELETE}` as Permission,
  ROLES_MANAGE: `${RESOURCES.ROLES}:${ACTIONS.MANAGE}` as Permission,

  // Messages
  MESSAGES_VIEW: `${RESOURCES.MESSAGES}:${ACTIONS.VIEW}` as Permission,
  MESSAGES_SEND: `${RESOURCES.MESSAGES}:${ACTIONS.CREATE}` as Permission,
  MESSAGES_MANAGE: `${RESOURCES.MESSAGES}:${ACTIONS.MANAGE}` as Permission,

  // Notifications
  NOTIFICATIONS_VIEW: `${RESOURCES.NOTIFICATIONS}:${ACTIONS.VIEW}` as Permission,
  NOTIFICATIONS_MANAGE: `${RESOURCES.NOTIFICATIONS}:${ACTIONS.MANAGE}` as Permission,

  // Contact Requests
  CONTACT_REQUESTS_VIEW: `${RESOURCES.CONTACT_REQUESTS}:${ACTIONS.VIEW}` as Permission,
  CONTACT_REQUESTS_ASSIGN: `${RESOURCES.CONTACT_REQUESTS}:${ACTIONS.ASSIGN}` as Permission,
  CONTACT_REQUESTS_UPDATE: `${RESOURCES.CONTACT_REQUESTS}:${ACTIONS.UPDATE}` as Permission,
  CONTACT_REQUESTS_MANAGE: `${RESOURCES.CONTACT_REQUESTS}:${ACTIONS.MANAGE}` as Permission,

  // Students
  STUDENTS_VIEW: `${RESOURCES.STUDENTS}:${ACTIONS.VIEW}` as Permission,
  STUDENTS_CREATE: `${RESOURCES.STUDENTS}:${ACTIONS.CREATE}` as Permission,
  STUDENTS_UPDATE: `${RESOURCES.STUDENTS}:${ACTIONS.UPDATE}` as Permission,
  STUDENTS_DELETE: `${RESOURCES.STUDENTS}:${ACTIONS.DELETE}` as Permission,
  STUDENTS_MANAGE: `${RESOURCES.STUDENTS}:${ACTIONS.MANAGE}` as Permission,

  // Settings
  SETTINGS_VIEW: `${RESOURCES.SETTINGS}:${ACTIONS.VIEW}` as Permission,
  SETTINGS_UPDATE: `${RESOURCES.SETTINGS}:${ACTIONS.UPDATE}` as Permission,
  SETTINGS_MANAGE: `${RESOURCES.SETTINGS}:${ACTIONS.MANAGE}` as Permission,
} as const

// Mapping menu items với permissions
export const MENU_PERMISSIONS = {
  dashboard: [PERMISSIONS.DASHBOARD_VIEW],
  users: [PERMISSIONS.USERS_VIEW],
  posts: [PERMISSIONS.POSTS_VIEW],
  categories: [PERMISSIONS.CATEGORIES_VIEW],
  tags: [PERMISSIONS.TAGS_VIEW],
  comments: [PERMISSIONS.COMMENTS_VIEW],
  roles: [PERMISSIONS.ROLES_VIEW],
  messages: [PERMISSIONS.MESSAGES_VIEW],
  notifications: [PERMISSIONS.NOTIFICATIONS_VIEW],
  contact_requests: [PERMISSIONS.CONTACT_REQUESTS_VIEW],
  students: [PERMISSIONS.STUDENTS_VIEW],
  settings: [PERMISSIONS.SETTINGS_VIEW],
} as const

// Default roles và permissions của chúng
export const DEFAULT_ROLES = {
  SUPER_ADMIN: {
    name: "super_admin",
    displayName: "Super Admin",
    permissions: Object.values(PERMISSIONS),
  },
  ADMIN: {
    name: "admin",
    displayName: "Admin",
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.USERS_VIEW,
      PERMISSIONS.USERS_CREATE,
      PERMISSIONS.USERS_UPDATE,
      PERMISSIONS.POSTS_VIEW,
      PERMISSIONS.POSTS_CREATE,
      PERMISSIONS.POSTS_UPDATE,
      PERMISSIONS.POSTS_PUBLISH,
      PERMISSIONS.POSTS_DELETE,
      PERMISSIONS.CATEGORIES_VIEW,
      PERMISSIONS.CATEGORIES_CREATE,
      PERMISSIONS.CATEGORIES_UPDATE,
      PERMISSIONS.TAGS_VIEW,
      PERMISSIONS.TAGS_CREATE,
      PERMISSIONS.COMMENTS_VIEW,
      PERMISSIONS.COMMENTS_APPROVE,
      PERMISSIONS.MESSAGES_VIEW,
      PERMISSIONS.NOTIFICATIONS_VIEW,
      PERMISSIONS.CONTACT_REQUESTS_VIEW,
      PERMISSIONS.CONTACT_REQUESTS_UPDATE,
      PERMISSIONS.SETTINGS_VIEW,
    ],
  },
  EDITOR: {
    name: "editor",
    displayName: "Editor",
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.POSTS_VIEW,
      PERMISSIONS.POSTS_CREATE,
      PERMISSIONS.POSTS_UPDATE,
      PERMISSIONS.POSTS_PUBLISH,
      PERMISSIONS.CATEGORIES_VIEW,
      PERMISSIONS.TAGS_VIEW,
      PERMISSIONS.COMMENTS_VIEW,
      PERMISSIONS.COMMENTS_APPROVE,
    ],
  },
  AUTHOR: {
    name: "author",
    displayName: "Author",
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.POSTS_VIEW,
      PERMISSIONS.POSTS_CREATE,
      PERMISSIONS.POSTS_UPDATE,
      PERMISSIONS.CATEGORIES_VIEW,
      PERMISSIONS.TAGS_VIEW,
    ],
  },
  USER: {
    name: "user",
    displayName: "User",
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.MESSAGES_VIEW,
      PERMISSIONS.NOTIFICATIONS_VIEW,
    ],
  },
} as const

/**
 * Check if user has permission
 */
export function hasPermission(
  userPermissions: Permission[],
  requiredPermission: Permission
): boolean {
  return userPermissions.includes(requiredPermission)
}

/**
 * Check if user has any of the required permissions
 */
export function hasAnyPermission(
  userPermissions: Permission[],
  requiredPermissions: Permission[]
): boolean {
  return requiredPermissions.some((perm) => userPermissions.includes(perm))
}

/**
 * Check if user has all required permissions
 */
export function hasAllPermissions(
  userPermissions: Permission[],
  requiredPermissions: Permission[]
): boolean {
  return requiredPermissions.every((perm) => userPermissions.includes(perm))
}

