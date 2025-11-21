/**
 * Server-side Cache Invalidation Helpers
 * 
 * Chuẩn hóa logic invalidate cache cho tất cả resource mutations
 * Theo chuẩn Next.js 16: revalidatePath + revalidateTag + updateTag
 * 
 * - revalidateTag: Purge cached data (async, có thể delay)
 * - updateTag: Update cached data immediately (chỉ trong Server Actions, read-your-own-writes)
 */

import { revalidatePath, revalidateTag, updateTag } from "next/cache"

/**
 * Resource name mapping theo Prisma schema
 */
export type ResourceName =
  | "users"
  | "categories"
  | "tags"
  | "posts"
  | "comments"
  | "roles"
  | "sessions"
  | "students"
  | "contact-requests"
  | "notifications"

/**
 * Options cho cache invalidation
 */
export interface InvalidateCacheOptions {
  /**
   * Resource name (theo Prisma model)
   */
  resource: ResourceName
  /**
   * Resource ID (optional, dùng cho detail page)
   */
  id?: string
  /**
   * Additional tags để invalidate (optional)
   */
  additionalTags?: string[]
}

/**
 * Invalidate cache cho resource mutations
 * 
 * @param options - Options cho cache invalidation
 * 
 * @example
 * ```typescript
 * // Invalidate sau khi create/update/delete
 * await invalidateResourceCache({ resource: "users", id: userId })
 * 
 * // Invalidate với additional tags
 * await invalidateResourceCache({ 
 *   resource: "categories", 
 *   id: categoryId,
 *   additionalTags: ["category-options", "active-categories"]
 * })
 * ```
 */
export async function invalidateResourceCache({
  resource,
  id,
  additionalTags = [],
}: InvalidateCacheOptions): Promise<void> {
  const basePath = `/admin/${resource}`
  
  // Revalidate list page và layout
  revalidatePath(basePath, "page")
  revalidatePath(basePath, "layout")
  
  // Revalidate detail page nếu có ID
  if (id) {
    revalidatePath(`${basePath}/${id}`, "page")
  }
  
  // Update tags immediately (read-your-own-writes semantics)
  // Chỉ hoạt động trong Server Actions, nếu không phải Server Action sẽ bị ignore
  // Wrap trong try-catch để không fail khi gọi từ Route Handlers
  try {
    updateTag(resource)
    if (id) {
      updateTag(`${resource}-${id}`)
    }
    for (const tag of additionalTags) {
      updateTag(tag)
    }
  } catch {
    // updateTag chỉ hoạt động trong Server Actions
    // Nếu gọi từ Route Handlers, sẽ bị ignore và chỉ dùng revalidateTag
    // Không cần log error vì đây là expected behavior
  }
  
  // Revalidate tags để purge cache (async, có thể delay)
  // Dùng để đảm bảo cache được clear hoàn toàn
  // Hoạt động trong cả Server Actions và Route Handlers
  revalidateTag(resource, "default")
  
  if (id) {
    revalidateTag(`${resource}-${id}`, "default")
  }
  
  for (const tag of additionalTags) {
    revalidateTag(tag, "default")
  }
}

/**
 * Invalidate cache cho bulk operations
 * 
 * @param resource - Resource name
 * @param additionalTags - Additional tags để invalidate
 * 
 * @example
 * ```typescript
 * // Invalidate sau khi bulk delete/restore
 * await invalidateResourceCacheBulk({ resource: "users" })
 * ```
 */
export async function invalidateResourceCacheBulk({
  resource,
  additionalTags = [],
}: Omit<InvalidateCacheOptions, "id">): Promise<void> {
  await invalidateResourceCache({ resource, additionalTags })
}

