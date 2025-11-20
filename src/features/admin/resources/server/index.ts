/**
 * Server-side exports for Resources feature
 * 
 * Generic patterns và helpers để các resource features khác có thể sử dụng
 * 
 * Structure:
 * - queries.ts: Generic query patterns và helpers
 * - cache.ts: Cache utilities
 * - helpers.ts: Shared helper functions
 * - errors.ts: Shared error classes
 * - mutations-helpers.ts: Shared mutation helpers
 */

// Helpers
export {
  validatePagination,
  buildPagination,
  serializeResourceForTable,
  serializeResourceList,
  serializeDate,
  serializeDates,
  applyStatusFilter,
  applySearchFilter,
  applyDateFilter,
  applyBooleanFilter,
  applyStringFilter,
  applyStatusFilterFromFilters,
  type ResourcePagination,
  type ResourceResponse,
} from "./helpers"

// Cache utilities
export { cache } from "./cache"

// Error classes
export {
  ApplicationError,
  ForbiddenError,
  NotFoundError,
} from "./errors"

// Mutation helpers
export {
  ensurePermission,
  type AuthContext,
} from "./mutations-helpers"

// Auth helpers
export {
  getAuthInfo,
  type SessionWithMeta,
  type AuthInfo,
} from "./auth-helpers"

// Page helpers
export {
  getTablePermissions,
  getTablePermissionsAsync,
  type TablePermissions,
} from "./page-helpers"

