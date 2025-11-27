import type { ReactNode } from "react"
import type { DataTableColumn, DataTableResult, DataTableQueryState } from "@/components/tables"

export type ResourceRefreshHandler = () => Promise<void> | void

export interface ResourceSelectionContext<T extends object> {
  view: ResourceViewMode<T>
  selectedIds: string[]
  selectedRows: T[]
  clearSelection: () => void
  refresh: () => void
}

export interface ResourceRowActionContext<T extends object> {
  view: ResourceViewMode<T>
  refresh: () => void
}

export interface ResourceViewMode<T extends object> {
  id: string
  label: string
  status?: string
  columns?: DataTableColumn<T>[]
  selectionEnabled?: boolean
  selectionActions?: (context: ResourceSelectionContext<T>) => ReactNode
  rowActions?: (row: T, context: ResourceRowActionContext<T>) => ReactNode
  searchPlaceholder?: string
  emptyMessage?: string
}

export interface ResourceTableLoader<T extends object> {
  (query: DataTableQueryState, view: ResourceViewMode<T>): Promise<DataTableResult<T>>
}

export interface ResourcePagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface ResourceResponse<T> {
  data: T[]
  pagination: ResourcePagination
}

export interface BaseResourceTableClientProps<T extends object> {
  canDelete?: boolean
  canRestore?: boolean
  canManage?: boolean
  canCreate?: boolean
  canUpdate?: boolean
  canView?: boolean
  initialData?: DataTableResult<T>
}

export interface BulkActionResult {
  success: boolean
  message: string
  affected: number
}
