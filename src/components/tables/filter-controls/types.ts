/**
 * Types và interfaces cho filter controls
 */
import type { DataTableColumn } from "../data-table"

export interface ColumnFilterSelectOption {
    label: string
    value: string
}

export type ColumnFilterConfig =
    | {
          type?: "text"
          placeholder?: string
      }
    | {
          type: "select"
          options: ColumnFilterSelectOption[]
          placeholder?: string
          searchPlaceholder?: string
          emptyMessage?: string
          onSearchChange?: (query: string) => void
          isLoading?: boolean
      }
    | {
          type: "multi-select"
          options: ColumnFilterSelectOption[]
          placeholder?: string
          searchPlaceholder?: string
          emptyMessage?: string
          onSearchChange?: (query: string) => void
          isLoading?: boolean
      }
    | {
          type: "date"
          placeholder?: string
          dateFormat?: string
          enableTime?: boolean
          showSeconds?: boolean
      }


export interface ColumnFilterControlProps<T extends object = object> {
    column: DataTableColumn<T>
    value: string
    disabled: boolean
    onChange: (value: string, immediate?: boolean) => void
}

