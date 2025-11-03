"use client"

import { useCallback, useState } from "react"
import {
  DataTable,
  type DataTableColumn,
  type DataTableLoader,
  type DataTableQueryState,
  type DataTableResult,
  type DataTableSelectionChange,
} from "@/components/data-table"
import { Button } from "@/components/ui/button"
import type {
  ResourceTableLoader,
  ResourceViewMode,
  ResourceSelectionContext,
  ResourceRowActionContext,
} from "@/features/resources/types"

export interface ResourceTableClientProps<T extends object> {
  title?: string
  baseColumns: DataTableColumn<T>[]
  loader: ResourceTableLoader<T>
  viewModes: ResourceViewMode<T>[]
  defaultViewId?: string
  initialDataByView?: Record<string, DataTableResult<T>>
  limitOptions?: number[]
  fallbackRowCount?: number
  searchPlaceholder?: string
}

export function ResourceTableClient<T extends object>({
  title,
  baseColumns,
  loader,
  viewModes,
  defaultViewId,
  initialDataByView,
  limitOptions,
  fallbackRowCount = 5,
  searchPlaceholder = "Tìm kiếm...",
}: ResourceTableClientProps<T>) {
  if (viewModes.length === 0) {
    throw new Error("ResourceTableClient requires at least one view mode")
  }

  const [currentViewId, setCurrentViewId] = useState(defaultViewId ?? viewModes[0].id)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [refreshKey, setRefreshKey] = useState(0)

  const activeView =
    viewModes.find((view) => view.id === currentViewId) ?? viewModes[0]

  const columns = activeView.columns ?? baseColumns
  const viewSearchPlaceholder = activeView.searchPlaceholder ?? searchPlaceholder
  const emptyMessage = activeView.emptyMessage

  const handleRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1)
  }, [])

  const handleViewChange = useCallback(
    (viewId: string) => {
      if (viewId === currentViewId) return
      setCurrentViewId(viewId)
      setSelectedIds([])
      handleRefresh()
    },
    [currentViewId, handleRefresh],
  )

  const dataLoader: DataTableLoader<T> = useCallback(
    (query: DataTableQueryState) => loader(query, activeView),
    [loader, activeView],
  )

  const selectionConfig = activeView.selectionEnabled
    ? {
        enabled: true,
        selectedIds,
        onSelectionChange: (change: DataTableSelectionChange<T>) => {
          setSelectedIds(change.ids)
        },
      }
    : undefined

  const selectionActions =
    activeView.selectionEnabled && activeView.selectionActions
      ? (context: { selectedIds: string[]; selectedRows: T[]; clearSelection: () => void }) =>
          activeView.selectionActions?.({
            view: activeView,
            selectedIds: context.selectedIds,
            selectedRows: context.selectedRows,
            clearSelection: context.clearSelection,
            refresh: handleRefresh,
          } satisfies ResourceSelectionContext<T>)
      : undefined

  const rowActions = activeView.rowActions
    ? (row: T) =>
        activeView.rowActions?.(row, {
          view: activeView,
          refresh: handleRefresh,
        } satisfies ResourceRowActionContext<T>)
    : undefined

  const initialData = initialDataByView?.[activeView.id]

  return (
    <div className="flex flex-col gap-4">
      {(title || viewModes.length > 1) && (
        <div className="flex items-center justify-between">
          {title ? <h2 className="text-lg font-semibold">{title}</h2> : <span />}
          {viewModes.length > 1 && (
            <div className="flex items-center gap-2">
              {viewModes.map((view) => (
                <Button
                  key={view.id}
                  type="button"
                  size="sm"
                  variant={currentViewId === view.id ? "default" : "outline"}
                  onClick={() => handleViewChange(view.id)}
                >
                  {view.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      <DataTable<T>
        columns={columns}
        loader={dataLoader}
        enableSearch
        searchPlaceholder={viewSearchPlaceholder}
        limitOptions={limitOptions}
        emptyMessage={emptyMessage}
        selection={selectionConfig}
        selectionActions={selectionActions}
        actions={rowActions}
        fallbackRowCount={fallbackRowCount}
        refreshKey={refreshKey}
        initialData={initialData}
      />
    </div>
  )
}
