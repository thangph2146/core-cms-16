/**
 * Client Component: Resource Table
 * 
 * Generic table component với view modes, selection, và actions
 * Pattern: Server Component → Client Component (UI/interactions)
 */

"use client"

import { useCallback, useState, useEffect, useMemo } from "react"
import {
  DataTable,
  type DataTableColumn,
  type DataTableLoader,
  type DataTableQueryState,
  type DataTableResult,
  type DataTableSelectionChange,
} from "@/components/tables"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"
import { logger } from "@/lib/config"
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

  const isMobile = useIsMobile()
  const [currentViewId, setCurrentViewId] = useState(defaultViewId ?? viewModes[0].id)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [refreshKey, setRefreshKey] = useState(0)

  const activeView =
    viewModes.find((view) => view.id === currentViewId) ?? viewModes[0]

  const columns = activeView.columns ?? baseColumns
  const emptyMessage = activeView.emptyMessage

  const handleRefresh = useCallback(() => {
    logger.debug("[ResourceTableClient] handleRefresh called")
    setRefreshKey((prev) => {
      const next = prev + 1
      logger.debug("[ResourceTableClient] refreshKey updated", { prev, next })
      return next
    })
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

  const viewModeButtons = useMemo(() => {
    if (viewModes.length <= 1) return null

    // On mobile: always use dropdown for better UX and space efficiency
    if (isMobile) {
      const currentView = viewModes.find((v) => v.id === currentViewId) ?? viewModes[0]
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 px-3 text-xs min-w-[100px] max-w-[180px] justify-between"
            >
              <span className="truncate">{currentView.label}</span>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[120px]">
            {viewModes.map((view) => (
              <DropdownMenuItem
                key={view.id}
                onClick={() => handleViewChange(view.id)}
                className={currentViewId === view.id ? "bg-accent font-medium" : ""}
              >
                {view.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }

    // Desktop/Tablet: use buttons with responsive sizing
    return (
      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
        {viewModes.map((view) => (
          <Button
            key={view.id}
            type="button"
            size="sm"
            variant={currentViewId === view.id ? "default" : "outline"}
            onClick={() => handleViewChange(view.id)}
            className="h-8 px-2 sm:px-3 text-xs sm:text-sm whitespace-nowrap"
          >
            {view.label}
          </Button>
        ))}
      </div>
    )
  }, [viewModes, currentViewId, isMobile, handleViewChange])

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      {(title || viewModes.length > 1 || headerActions) && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
          {title ? (
            <h2 className="text-base sm:text-lg font-semibold truncate">{title}</h2>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap w-full sm:w-auto justify-end sm:justify-start">
            {viewModeButtons}
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
