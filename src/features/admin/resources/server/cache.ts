/**
 * Generic Cache Patterns for Resources
 * 
 * Đây là base patterns cho cache functions. Mỗi resource feature nên tạo
 * cache functions riêng trong server/cache.ts của feature đó.
 * 
 * Example:
 * ```typescript
 * // src/features/admin/users/server/cache.ts
 * import { cache } from "react"
 * import { listUsers } from "./queries"
 * 
 * export const listUsersCached = cache(
 *   async (page: number, limit: number, search: string) => {
 *     return listUsers({ page, limit, search })
 *   }
 * )
 * ```
 */

/**
 * Cache utility: Wrapper để tạo cached functions
 * 
 * Pattern:
 * ```typescript
 * import { cache } from "react"
 * import { createCachedFunction } from "@/features/admin/resources/server/cache"
 * 
 * export const listResourceCached = cache(createCachedFunction(listResource))
 * ```
 */

// Re-export React cache for convenience
export { cache } from "react"

