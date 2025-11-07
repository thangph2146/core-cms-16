/**
 * Multi Select Filter Component (Sử dụng MultiCommandCombobox)
 */
"use client"

import { MultiCommandCombobox } from "./customs/multi-command-combobox"
import type { ColumnFilterControlProps } from "./types"
import type { DataTableColumn } from "../data-table"

export function MultiSelectFilter<T extends object = object>({
    column,
    value,
    disabled,
    onChange,
}: ColumnFilterControlProps<T>) {
    if (column.filter?.type !== "multi-select") return null

    // Sử dụng MultiCommandCombobox
    // Chuyển đổi filter config từ "multi-select" sang "multi-command" format
    const multiCommandFilter = {
        ...column,
        filter: {
            type: "multi-command" as const,
            options: column.filter.options,
            placeholder: column.filter.placeholder,
            searchPlaceholder: column.filter.searchPlaceholder ?? "Tìm kiếm...",
            emptyMessage: column.filter.emptyMessage ?? "Không tìm thấy.",
            onSearchChange: column.filter.onSearchChange,
            isLoading: column.filter.isLoading,
        },
    } as unknown as DataTableColumn<T>

    return <MultiCommandCombobox column={multiCommandFilter} value={value} disabled={disabled} onChange={onChange} />
}

