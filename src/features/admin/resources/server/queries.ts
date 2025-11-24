/**
 * Generic Query Patterns for Resources
 * 
 * Đây là base patterns cho queries. Mỗi resource feature nên tạo
 * queries riêng trong server/queries.ts của feature đó.
 * 
 * Example:
 * ```typescript
 * // src/features/admin/users/server/queries.ts
 * import { validatePagination, buildPagination, type ResourceResponse } from "@/features/admin/resources/server/queries"
 * 
 * export async function listUsers(params: ListUsersInput): Promise<ResourceResponse<ListedUser>> {
 *   const { page, limit } = validatePagination(params.page, params.limit)
 *   // ... query logic
 *   return {
 *     data: users,
 *     pagination: buildPagination(page, limit, total)
 *   }
 * }
 * ```
 */

export {
  validatePagination,
  buildPagination,
  serializeResourceForTable,
  serializeResourceList,
  serializeDate,
  serializeDates,
} from "./helpers"

