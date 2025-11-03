/**
 * Helper functions để check permissions và super admin
 */
import type { Permission } from "./permissions"
import { DEFAULT_ROLES } from "./permissions"

/**
 * Check if user is super admin based on roles
 */
export function isSuperAdmin(roles: Array<{ name: string }>): boolean {
  return roles.some((role) => role.name === DEFAULT_ROLES.SUPER_ADMIN.name)
}

/**
 * Check if user can perform action (super admin has all permissions)
 */
export function canPerformAction(
  userPermissions: Permission[],
  userRoles: Array<{ name: string }>,
  requiredPermission: Permission
): boolean {
  // Super admin can do everything
  if (isSuperAdmin(userRoles)) {
    return true
  }
  // Check specific permission
  return userPermissions.includes(requiredPermission)
}

/**
 * Check if user can perform any of the actions
 */
export function canPerformAnyAction(
  userPermissions: Permission[],
  userRoles: Array<{ name: string }>,
  requiredPermissions: Permission[]
): boolean {
  // Super admin can do everything
  if (isSuperAdmin(userRoles)) {
    return true
  }
  // Check if user has any of the required permissions
  return requiredPermissions.some((perm) => userPermissions.includes(perm))
}

