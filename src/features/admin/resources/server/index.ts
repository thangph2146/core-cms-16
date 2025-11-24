/**
 * Server-side exports for Resources feature
 * 
 * Generic patterns và helpers để các resource features khác có thể sử dụng
 * 
 * Structure:
 * - queries.ts: Generic query patterns và helpers
 * - helpers.ts: Shared helper functions
 * - errors.ts: Shared error classes
 * - mutations-helpers.ts: Shared mutation helpers
 * 
 * LƯU Ý: Không sử dụng caching cho admin data theo chuẩn Next.js 16
 * Tất cả queries đều fetch fresh data từ database
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
} from "./helpers"

// Re-export types from types for backward compatibility
export type { ResourcePagination, ResourceResponse } from "../types"

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

// New mutation helpers (logTableStatusAfterMutation, logActionFlow, logDetailAction)
export {
  logTableStatusAfterMutation,
  logActionFlow,
  logDetailAction,
} from "./mutation-helpers"

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

// Column options helpers
export {
  applyColumnOptionsStatusFilter,
  applyColumnOptionsSearchFilter,
  buildColumnOptionsWhereClause,
  mapToColumnOptions,
  type ColumnOptionsQueryOptions,
} from "./column-options-helpers"

