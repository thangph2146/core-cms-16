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

// Route permissions mapping
export {
  ROUTE_PERMISSIONS,
  getRoutePermissions,
  requiresPermission,
} from "./route-permissions"

