/**
 * Server Component: Resource Detail
 * 
 * Generic server wrapper cho ResourceDetailPage
 * Pattern: Server Component (data fetching) → Client Component (UI/interactions)
 * 
 * Usage:
 * ```typescript
 * // In your feature (e.g., users)
 * export async function UserDetail({ userId }: UserDetailProps) {
 *   const user = await getUserDetailById(userId)
 *   if (!user) return <NotFound />
 *   return (
 *     <ResourceDetail
 *       data={serializeUserDetail(user)}
 *       fields={userDetailFields}
 *       {...props}
 *     />
 *   )
 * }
 * ```
 */

import { ResourceDetailPage } from "./resource-detail-page"
import type { ResourceDetailPageProps } from "./resource-detail-page"

export type ResourceDetailProps<T extends Record<string, unknown>> = ResourceDetailPageProps<T>

/**
 * ResourceDetail Server Component
 * 
 * Wrapper để pass data từ server xuống client component
 * Mỗi feature nên tạo wrapper riêng để fetch và serialize data cụ thể
 */
export function ResourceDetail<T extends Record<string, unknown>>(
  props: ResourceDetailProps<T>
) {
  return <ResourceDetailPage {...props} />
}

