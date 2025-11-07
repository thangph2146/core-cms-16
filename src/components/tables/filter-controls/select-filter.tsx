/**
 * Select Filter Component (Sử dụng CommandCombobox)
 */
"use client"

import { CommandCombobox } from "./customs/command-combobox"
import type { ColumnFilterControlProps } from "./types"
import type { DataTableColumn } from "../data-table"

export function SelectFilter<T extends object = object>({
    column,
    value,
    disabled,
    onChange,
}: ColumnFilterControlProps<T>) {
    if (column.filter?.type !== "select") return null

    const commandFilter = {
        ...column,
        filter: {
            type: "command" as const,
            options: column.filter.options,
            placeholder: column.filter.placeholder,
            searchPlaceholder: column.filter.searchPlaceholder ?? "Tìm kiếm...",
            emptyMessage: column.filter.emptyMessage ?? "Không tìm thấy.",
            onSearchChange: column.filter.onSearchChange,
            isLoading: column.filter.isLoading,
        },
    } as unknown as DataTableColumn<T>

    return <CommandCombobox column={commandFilter} value={value} disabled={disabled} onChange={onChange} />
}

