/**
 * Shared helper functions for route permissions
 */

/**
 * Convert pattern to regex (e.g., "/admin/users/[id]" -> "^/admin/users/[^/]+$")
 */
export function patternToRegex(pattern: string): RegExp {
  const regexPattern = pattern.replace(/\[([^\]]+)\]/g, "[^/]+").replace(/\//g, "\\/")
  return new RegExp(`^${regexPattern}$`)
}

/**
 * Match pattern với pathname
 */
export function matchPattern(pattern: string, pathname: string): boolean {
  return patternToRegex(pattern).test(pathname)
}

/**
 * Normalize pathname: remove query params and trailing slash
 */
export function normalizePathname(pathname: string): string {
  return pathname.split("?")[0].replace(/\/$/, "") || "/"
}

