/**
 * API Path Configuration
 *
 * Centralizes base paths và helpers để tránh hardcode `/api` khắp nơi.
 * Routes trong `apiRoutes` cố ý không có prefix, các helper này sẽ thêm/bỏ prefix khi cần.
 */

export const apiPathConfig = {
  basePath: "/api",
  adminBasePath: "/api/admin",
} as const

const ABSOLUTE_URL_PATTERN = /^https?:\/\//i

const ensureLeadingSlash = (path: string): string => {
  if (!path) return "/"
  return path.startsWith("/") ? path : `/${path}`
}

const isAbsoluteUrl = (path: string): boolean => ABSOLUTE_URL_PATTERN.test(path)

/**
 * Thêm `/api` prefix cho relative path. Nếu path đã có prefix hoặc là absolute URL thì trả nguyên vẹn.
 */
export function withApiBase(path: string): string {
  if (!path) {
    return apiPathConfig.basePath
  }
  if (isAbsoluteUrl(path)) {
    return path
  }
  const normalized = ensureLeadingSlash(path)
  if (normalized.startsWith(apiPathConfig.basePath)) {
    return normalized
  }
  return `${apiPathConfig.basePath}${normalized}`
}

/**
 * Thêm `/api/admin` prefix cho các admin relative path.
 */
export function withAdminApiBase(path: string): string {
  if (!path) {
    return apiPathConfig.adminBasePath
  }
  if (isAbsoluteUrl(path)) {
    return path
  }
  const normalized = ensureLeadingSlash(path)
  if (normalized.startsWith(apiPathConfig.adminBasePath)) {
    return normalized
  }
  if (normalized.startsWith("/admin")) {
    return `${apiPathConfig.basePath}${normalized}`
  }
  return `${apiPathConfig.adminBasePath}${normalized}`
}

/**
 * Bỏ `/api` prefix để tận dụng chung cho page routes.
 */
export function stripApiBase(path: string): string {
  if (!path || isAbsoluteUrl(path)) {
    return path
  }
  if (!path.startsWith(apiPathConfig.basePath)) {
    return ensureLeadingSlash(path)
  }
  const stripped = path.slice(apiPathConfig.basePath.length) || "/"
  return ensureLeadingSlash(stripped)
}

/**
 * Bỏ `/api/admin` prefix nhưng fallback sang stripApiBase nếu chỉ có `/api`.
 */
export function stripAdminApiBase(path: string): string {
  if (!path || isAbsoluteUrl(path)) {
    return path
  }
  const normalized = ensureLeadingSlash(path)
  if (normalized.startsWith(apiPathConfig.adminBasePath)) {
    const stripped = normalized.slice(apiPathConfig.adminBasePath.length) || "/"
    return ensureLeadingSlash(stripped)
  }
  return stripApiBase(normalized)
}
