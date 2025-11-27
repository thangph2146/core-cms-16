import { Suspense } from "react"
import { ResourceTableClient } from "./resource-table.client"
import type { ResourceTableClientProps } from "./resource-table.client"
import { ResourceTableSkeleton } from "@/components/layouts/skeletons"

export interface ResourceTableProps<T extends object> extends Omit<ResourceTableClientProps<T>, "initialDataByView" | "loader"> {
  initialDataByView?: ResourceTableClientProps<T>["initialDataByView"]
  loader: ResourceTableClientProps<T>["loader"]
}

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

