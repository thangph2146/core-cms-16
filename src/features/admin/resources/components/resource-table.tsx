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
 * 
 * Hoặc với Suspense:
 * ```typescript
 * <Suspense fallback={<ResourceTableSkeleton />}>
 *   <ResourceTable {...props} />
 * </Suspense>
 * ```
 */

import { Suspense } from "react"
import { ResourceTableClient } from "./resource-table.client"
import type { ResourceTableClientProps } from "./resource-table.client"
import { ResourceTableSkeleton } from "@/components/skeletons"

export interface ResourceTableProps<T extends object> extends Omit<ResourceTableClientProps<T>, "initialDataByView" | "loader"> {
  initialDataByView?: ResourceTableClientProps<T>["initialDataByView"]
  loader: ResourceTableClientProps<T>["loader"]
}

/**
 * ResourceTable Server Component
 * 
 * Wrapper để fetch initial data trên server và pass xuống client component
 * Mỗi feature nên tạo wrapper riêng để fetch data cụ thể
 * 
 * Component này được thiết kế để được wrap trong Suspense boundary ở page level
 * để hiển thị skeleton loading state khi data đang được fetch
 */
export async function ResourceTable<T extends object>({
  initialDataByView,
  loader,
  title,
  viewModes,
  baseColumns,
  fallbackRowCount = 5,
  ...props
}: ResourceTableProps<T>) {
  return (
    <ResourceTableClient
      initialDataByView={initialDataByView}
      loader={loader}
      title={title}
      viewModes={viewModes}
      baseColumns={baseColumns}
      fallbackRowCount={fallbackRowCount}
      {...props}
    />
  )
}

/**
 * ResourceTableWithSuspense
 * 
 * Wrapper component với Suspense boundary built-in
 * Sử dụng component này nếu bạn muốn Suspense được xử lý tự động
 */
export function ResourceTableWithSuspense<T extends object>({
  title,
  viewModes,
  baseColumns,
  fallbackRowCount = 5,
  ...props
}: ResourceTableProps<T>) {
  const columnCount = viewModes?.[0]?.columns?.length ?? baseColumns?.length ?? 4
  const viewModeCount = viewModes?.length ?? 1

  return (
    <Suspense
      fallback={
        <ResourceTableSkeleton
          title={!!title}
          viewModes={viewModeCount}
          rowCount={fallbackRowCount}
          columnCount={columnCount}
        />
      }
    >
      <ResourceTable
        title={title}
        viewModes={viewModes}
        baseColumns={baseColumns}
        fallbackRowCount={fallbackRowCount}
        {...props}
      />
    </Suspense>
  )
}

