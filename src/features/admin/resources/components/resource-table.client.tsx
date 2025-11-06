/**
 * Client Component: Resource Table
 * 
 * Generic table component với view modes, selection, và actions
 * Pattern: Server Component → Client Component (UI/interactions)
 */

"use client"

import { useCallback, useState, useEffect } from "react"
import {
  DataTable,
  type DataTableColumn,
  type DataTableLoader,
  type DataTableQueryState,
  type DataTableResult,
  type DataTableSelectionChange,
} from "@/components/tables"
import { Button } from "@/components/ui/button"
import type {
  ResourceTableLoader,
  ResourceViewMode,
  ResourceSelectionContext,
  ResourceRowActionContext,
} from "@/features/admin/resources/types"

export interface ResourceTableClientProps<T extends object> {
  title?: string
  baseColumns: DataTableColumn<T>[]
  loader: ResourceTableLoader<T>
  viewModes: ResourceViewMode<T>[]
  defaultViewId?: string
  initialDataByView?: Record<string, DataTableResult<T>>
  limitOptions?: number[]
  fallbackRowCount?: number
  headerActions?: React.ReactNode
  onRefreshReady?: (refresh: () => void) => void
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
  headerActions,
  onRefreshReady,
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
  const emptyMessage = activeView.emptyMessage

  const handleRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1)
  }, [])

  // Expose refresh function to parent component
  useEffect(() => {
    onRefreshReady?.(handleRefresh)
  }, [handleRefresh, onRefreshReady])

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
    <div className="flex flex-col gap-3 sm:gap-4">
      {(title || viewModes.length > 1 || headerActions) && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
          {title ? <h2 className="text-base sm:text-lg font-semibold">{title}</h2> : <span />}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {viewModes.length > 1 && (
              <>
                {viewModes.map((view) => (
                  <Button
                    key={view.id}
                    type="button"
                    size="sm"
                    variant={currentViewId === view.id ? "default" : "outline"}
                    onClick={() => handleViewChange(view.id)}
                    className="h-8 px-2 sm:px-3 text-xs sm:text-sm"
                  >
                    {view.label}
                  </Button>
                ))}
              </>
            )}
            {headerActions}
          </div>
        </div>
      )}

      <DataTable<T>
        columns={columns}
        loader={dataLoader}
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
