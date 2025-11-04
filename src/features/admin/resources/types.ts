import type { ReactNode } from "react"
import type { DataTableColumn, DataTableResult, DataTableQueryState } from "@/components/tables"

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

/**
 * Generic pagination response structure
 */
export interface ResourcePagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

/**
 * Generic API response structure for resource lists
 */
export interface ResourceResponse<T> {
  data: T[]
  pagination: ResourcePagination
}

/**
 * Base table client props with common permissions
 * Use this for extending in specific resource table client props
 */
export interface BaseResourceTableClientProps<T extends object> {
  canDelete?: boolean
  canRestore?: boolean
  canManage?: boolean
  canCreate?: boolean
  canUpdate?: boolean
  canView?: boolean
  initialData?: DataTableResult<T>
}
