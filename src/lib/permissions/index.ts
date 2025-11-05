/**
 * Permissions Barrel Export
 * 
 * Export tất cả permissions related utilities từ một nơi
 */

// Core permissions definitions
export {
  RESOURCES,
  ACTIONS,
  PERMISSIONS,
  MENU_PERMISSIONS,
  DEFAULT_ROLES,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
} from "./permissions"

// Re-export types
export type {
  Permission,
} from "./permissions"

// Permission helper functions
export {
  isSuperAdmin,
  canPerformAction,
  canPerformAnyAction,
} from "./permissions-helpers"

// Route configuration (single source of truth)
export { ROUTE_CONFIG, type HttpMethod } from "./route-config"

// Route permissions mapping (generated from ROUTE_CONFIG)
export {
  ROUTE_PERMISSIONS,
  getRoutePermissions,
  requiresPermission,
} from "./route-permissions"

// API Route permissions mapping (generated from ROUTE_CONFIG)
export {
  API_ROUTE_PERMISSIONS,
  getApiRoutePermissions,
  requiresApiPermission,
} from "./api-route-permissions"

// Shared route helpers
export { patternToRegex, matchPattern, normalizePathname } from "./route-helpers"

