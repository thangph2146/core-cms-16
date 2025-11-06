/**
 * Server-side exports for Resources feature
 * 
 * Generic patterns và helpers để các resource features khác có thể sử dụng
 * 
 * Structure:
 * - queries.ts: Generic query patterns và helpers
 * - cache.ts: Cache utilities
 * - helpers.ts: Shared helper functions
 */

// Helpers
export {
  validatePagination,
  buildPagination,
  serializeResourceForTable,
  serializeResourceList,
  serializeDate,
  serializeDates,
  type ResourcePagination,
  type ResourceResponse,
} from "./helpers"

// Cache utilities
export { cache } from "./cache"

