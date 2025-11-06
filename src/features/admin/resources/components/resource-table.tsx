/**
 * Server Component: Resource Table
 * 
 * Generic server wrapper cho ResourceTableClient
 * Pattern: Server Component (data fetching) → Client Component (UI/interactions)
 * 
 * Usage:
 * ```typescript
 * // In your feature (e.g., users)
 * export async function UsersTable(props: UsersTableProps) {
 *   const initial = await listUsersCached(1, 10, "", "", "active")
 *   return (
 *     <ResourceTable
 *       initialDataByView={{ active: serializeUsersList(initial) }}
 *       loader={...}
 *       {...props}
 *     />
 *   )
 * }
 * ```
 */

import { ResourceTableClient } from "./resource-table.client"
import type { ResourceTableClientProps } from "./resource-table.client"

export interface ResourceTableProps<T extends object> extends Omit<ResourceTableClientProps<T>, "initialDataByView" | "loader"> {
  initialDataByView?: ResourceTableClientProps<T>["initialDataByView"]
  loader: ResourceTableClientProps<T>["loader"]
}

/**
 * ResourceTable Server Component
 * 
 * Wrapper để fetch initial data trên server và pass xuống client component
 * Mỗi feature nên tạo wrapper riêng để fetch data cụ thể
 */
export async function ResourceTable<T extends object>({
  initialDataByView,
  loader,
  ...props
}: ResourceTableProps<T>) {
  return (
    <ResourceTableClient
      initialDataByView={initialDataByView}
      loader={loader}
      {...props}
    />
  )
}

