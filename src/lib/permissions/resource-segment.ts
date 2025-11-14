/**
 * Resource segment helpers cho App Router dynamic routes
 *
 * - DEFAULT_RESOURCE_SEGMENT: canonical segment dùng trong cấu hình `/admin`
 * - ROLE_RESOURCE_SEGMENTS: ánh xạ role name -> segment hiển thị
 * - getResourceSegmentForRoles: xác định segment dựa trên session roles
 * - applyResourceSegmentToPath: convert canonical path (`/admin/...`) sang segment hiện tại
 * - toCanonicalResourcePath: convert path thực tế về canonical `/admin/...` để reuse permissions logic
 */

import { DEFAULT_ROLES } from "./permissions"

export const DEFAULT_RESOURCE_SEGMENT = "admin"

const ROLE_RESOURCE_SEGMENTS: Record<string, string> = {
  [DEFAULT_ROLES.SUPER_ADMIN.name]: DEFAULT_ROLES.SUPER_ADMIN.name,
  [DEFAULT_ROLES.ADMIN.name]: DEFAULT_ROLES.ADMIN.name,
  [DEFAULT_ROLES.EDITOR.name]: DEFAULT_ROLES.EDITOR.name,
  [DEFAULT_ROLES.AUTHOR.name]: DEFAULT_ROLES.AUTHOR.name,
  [DEFAULT_ROLES.USER.name]: DEFAULT_ROLES.USER.name,
  [DEFAULT_ROLES.PARENT.name]: DEFAULT_ROLES.PARENT.name,
}

const SEGMENT_PATTERN = /^\/([^/]+)(.*)$/

const normalizeRoleName = (name?: string | null) => (name ?? "").toLowerCase()

export function getResourceSegmentForRoles(
  roles: Array<{ name?: string | null }> = [],
  fallback: string = DEFAULT_RESOURCE_SEGMENT
): string {
  for (const role of roles) {
    const normalized = normalizeRoleName(role?.name ?? "")
    const segment = ROLE_RESOURCE_SEGMENTS[normalized]
    if (segment) {
      return segment
    }
  }
  return fallback
}

export function applyResourceSegmentToPath(path: string, segment: string): string {
  if (!path.startsWith(`/${DEFAULT_RESOURCE_SEGMENT}`)) {
    return path
  }
  if (segment === DEFAULT_RESOURCE_SEGMENT) {
    return path
  }
  return path.replace(`/${DEFAULT_RESOURCE_SEGMENT}`, `/${segment}`)
}

export function toCanonicalResourcePath(path: string, segment: string): string {
  if (segment === DEFAULT_RESOURCE_SEGMENT) {
    return path
  }
  const match = path.match(SEGMENT_PATTERN)
  if (!match) {
    return path
  }
  const [, currentSegment, rest] = match
  if (currentSegment !== segment) {
    return path
  }
  return `/${DEFAULT_RESOURCE_SEGMENT}${rest || ""}`
}

export function replaceResourceSegment(path: string, fromSegment: string, toSegment: string): string {
  if (!path.startsWith(`/${fromSegment}`)) {
    return path
  }
  return path.replace(`/${fromSegment}`, `/${toSegment}`)
}

