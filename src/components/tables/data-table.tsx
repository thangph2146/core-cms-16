"use client"

import {
    Suspense,
    use,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    useTransition,
    type ReactNode,
} from "react"
import { ChevronLeft, ChevronRight, Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { useDebouncedCallback } from "@/hooks/use-debounced-callback"
import { ColumnFilterControl, type ColumnFilterConfig } from "./filter-controls"

type UnknownRecord = Record<string, unknown>

export interface DataTableColumn<T extends object> {
    accessorKey: keyof T & string
    header: string
    cell?: (row: T) => ReactNode
    filter?: ColumnFilterConfig
    className?: string
    headerClassName?: string
}

// Re-export filter types for convenience
export type { ColumnFilterConfig, ColumnFilterSelectOption } from "./filter-controls"

export interface DataTableQueryState {
    page: number
    limit: number
    search: string
    filters: Record<string, string>
}

export interface DataTableResult<T extends object> {
    rows: T[]
    page: number
    limit: number
    total: number
    totalPages: number
}

export type DataTableLoader<T extends object> = (
    query: DataTableQueryState,
) => Promise<DataTableResult<T>>

export interface DataTableSelectionChange<T> {
    ids: string[]
    rows: T[]
}

export interface DataTableSelectionConfig<T extends object> {
    enabled: boolean
    selectedIds?: string[]
    defaultSelectedIds?: string[]
    onSelectionChange?: (change: DataTableSelectionChange<T>) => void
    isRowSelectable?: (row: T) => boolean
    disabled?: boolean
}

export interface DataTableProps<T extends object> {
    columns: DataTableColumn<T>[]
    loader: DataTableLoader<T>
    actions?: (row: T) => ReactNode
    className?: string
    initialFilters?: Record<string, string>
    initialPage?: number
    initialLimit?: number
    limitOptions?: number[]
    emptyMessage?: string
    getRowId?: (row: T, index: number) => string
    refreshKey?: number | string
    fallbackRowCount?: number
    initialData?: DataTableResult<T>
    selection?: DataTableSelectionConfig<T>
    selectionActions?: (context: {
        selectedIds: string[]
        selectedRows: T[]
        clearSelection: () => void
    }) => ReactNode
    maxHeight?: string | number
    enableHorizontalScroll?: boolean
    maxWidth?: string | number
}

const DEFAULT_LIMIT_OPTIONS = [10, 20, 50, 100]
const DEFAULT_EMPTY_MESSAGE = "Không có dữ liệu"

function areQueriesEqual(a: DataTableQueryState, b: DataTableQueryState) {
    if (a.page !== b.page) return false
    if (a.limit !== b.limit) return false
    if (a.search !== b.search) return false
    const keysA = Object.keys(a.filters)
    const keysB = Object.keys(b.filters)
    if (keysA.length !== keysB.length) return false
    return keysA.every((key) => a.filters[key] === b.filters[key])
}

export function DataTable<T extends object>({
    columns,
    loader,
    actions,
    className,
    initialFilters,
    initialPage = 1,
    initialLimit,
    limitOptions,
    emptyMessage = DEFAULT_EMPTY_MESSAGE,
    getRowId = (row) => {
        const id = (row as UnknownRecord).id
        return typeof id === "string" ? id : JSON.stringify(row)
    },
    refreshKey,
    fallbackRowCount = 5,
    initialData,
    selection,
    selectionActions,
    maxHeight: _maxHeight,
    enableHorizontalScroll: _enableHorizontalScroll = true,
    maxWidth,
}: DataTableProps<T>) {
    const availableLimits = useMemo(() => {
        const base = limitOptions && limitOptions.length > 0 ? [...limitOptions] : [...DEFAULT_LIMIT_OPTIONS]
        const normalizedInitialLimit = initialLimit ?? base[0]
        if (!base.includes(normalizedInitialLimit)) {
            base.push(normalizedInitialLimit)
            base.sort((a, b) => a - b)
        }
        return base
    }, [limitOptions, initialLimit])

    const defaultFilters = useMemo(() => {
        const filters: Record<string, string> = {}
        if (initialFilters) {
            Object.entries(initialFilters).forEach(([key, value]) => {
                if (value != null && value !== "") {
                    filters[key] = value
                }
            })
        }
        return filters
    }, [initialFilters])

    const defaultQuery = useMemo<DataTableQueryState>(
        () => ({
            page: initialPage,
            limit: initialLimit ?? availableLimits[0],
            search: "",
            filters: defaultFilters,
        }),
        [initialPage, initialLimit, availableLimits, defaultFilters],
    )

    const [query, setQuery] = useState<DataTableQueryState>(defaultQuery)
    const [pendingTextFilters, setPendingTextFilters] = useState<Record<string, string>>(
        () => ({ ...defaultFilters }),
    )
    const [showFilters, setShowFilters] = useState<boolean>(true)
    const hasConsumedInitialRef = useRef(!initialData)

    const [dataPromise, setDataPromise] = useState<Promise<DataTableResult<T>>>(() =>
        safeLoad(loader, defaultQuery),
    )
    const [isPending, startTransition] = useTransition()
    const selectionEnabled = Boolean(selection?.enabled)
    const selectionDisabled = Boolean(selection?.disabled)
    const isRowSelectable = useMemo(
        () => selection?.isRowSelectable ?? (() => true),
        [selection?.isRowSelectable],
    )

    const [internalSelectedIds, setInternalSelectedIds] = useState<Set<string>>(
        () => new Set(selection?.defaultSelectedIds ?? []),
    )
    useEffect(() => {
        if (selectionEnabled && selection?.selectedIds) {
            setInternalSelectedIds(new Set(selection.selectedIds))
        }
    }, [selectionEnabled, selection?.selectedIds])

    const [visibleRows, setVisibleRows] = useState<T[]>([])
    const applyFilters = useCallback((filters: Record<string, string>) => {
        setQuery((prev) => {
            const keysPrev = Object.keys(prev.filters)
            const keysNext = Object.keys(filters)
            const same =
                keysPrev.length === keysNext.length && keysNext.every((key) => prev.filters[key] === filters[key])
            if (same) {
                return prev
            }
            return {
                ...prev,
                page: 1,
                filters: { ...filters },
            }
        })
    }, [])
    const debouncedApplyFilters = useDebouncedCallback(applyFilters, 300)

    const prevQueryRef = useRef<DataTableQueryState>(query)
    const prevRefreshKeyRef = useRef(refreshKey)

    useEffect(() => {
        const refreshKeyChanged = prevRefreshKeyRef.current !== refreshKey
        if (refreshKeyChanged) {
            prevRefreshKeyRef.current = refreshKey
        }

        const queryChanged = !areQueriesEqual(query, prevQueryRef.current)
        
        if (!queryChanged && !refreshKeyChanged) {
            prevQueryRef.current = query
            return
        }

        prevQueryRef.current = query

        startTransition(() => {
            setDataPromise(safeLoad(loader, query))
            
            if (initialData && !hasConsumedInitialRef.current) {
                hasConsumedInitialRef.current = true
            }
        })
    }, [loader, query, refreshKey, initialData])

    const hasAppliedFilters =
        query.search.trim().length > 0 ||
        Object.values(query.filters).some((value) => value && value.trim().length > 0)
    const hasPendingFilters = Object.values(pendingTextFilters).some((value) => value && value.trim().length > 0)
    const showClearFilters = hasAppliedFilters || hasPendingFilters

    const handleFilterChange = (columnKey: string, value: string, immediate = false) => {
        setPendingTextFilters((prev) => {
            const next = { ...prev }
            if (!value) {
                delete next[columnKey]
            } else {
                next[columnKey] = value
            }
            if (immediate) {
                debouncedApplyFilters.cancel()
                applyFilters(next)
            } else {
                debouncedApplyFilters(next)
            }
            return next
        })
    }

    const handleLimitChange = (value: number) => {
        setQuery((prev) => ({
            ...prev,
            page: 1,
            limit: value,
        }))
    }

    const handlePageChange = (nextPage: number, totalPages?: number) => {
        setQuery((prev) => {
            const clampedTotalPages = totalPages ?? prev.page
            const safePage = Math.max(1, Math.min(nextPage, clampedTotalPages || 1))
            if (safePage === prev.page) {
                return prev
            }
            return {
                ...prev,
                page: safePage,
            }
        })
    }

    const handleResetFilters = () => {
        debouncedApplyFilters.cancel()
        setPendingTextFilters({})
        applyFilters({})
        setQuery((prev) => ({
            ...prev,
            page: 1,
            search: "",
            filters: {},
        }))
    }

    const selectionSelectedIds = selection?.selectedIds
    const selectionOnChange = selection?.onSelectionChange

    const selectedIdsSet = useMemo(
        () => (selectionSelectedIds ? new Set(selectionSelectedIds) : internalSelectedIds),
        [selectionSelectedIds, internalSelectedIds],
    )

    const commitSelection = useCallback(
        (mutator: (draft: Set<string>) => void) => {
            if (!selectionEnabled) return
            const base = selectionSelectedIds ? new Set(selectionSelectedIds) : new Set(internalSelectedIds)
            mutator(base)
            const next = new Set(base)
            if (!selectionSelectedIds) {
                setInternalSelectedIds(next)
            }
            if (selectionOnChange) {
                const rows = visibleRows
                    .map((row, index) => ({ row, id: getRowId(row, index) }))
                    .filter(({ id }) => next.has(id))
                    .map(({ row }) => row)
                selectionOnChange({
                    ids: Array.from(next),
                    rows,
                })
            }
        },
        [selectionEnabled, selectionSelectedIds, selectionOnChange, internalSelectedIds, visibleRows, getRowId],
    )

    const handleRowToggle = useCallback(
        (row: T, rowId: string, checked: boolean) => {
            if (!selectionEnabled || selectionDisabled) return
            commitSelection((draft) => {
                if (checked) {
                    draft.add(rowId)
                } else {
                    draft.delete(rowId)
                }
            })
        },
        [selectionEnabled, selectionDisabled, commitSelection],
    )

    const handleToggleAll = useCallback(
        (rowIds: string[], checked: boolean) => {
            if (!selectionEnabled || selectionDisabled) return
            if (rowIds.length === 0) return
            commitSelection((draft) => {
                rowIds.forEach((id) => {
                    if (checked) {
                        draft.add(id)
                    } else {
                        draft.delete(id)
                    }
                })
            })
        },
        [selectionEnabled, selectionDisabled, commitSelection],
    )

    const clearSelection = useCallback(() => {
        if (!selectionEnabled || selectionDisabled) return
        commitSelection((draft) => {
            draft.clear()
        })
    }, [selectionEnabled, selectionDisabled, commitSelection])

    const visibleRowMeta = useMemo(
        () =>
            visibleRows.map((row, index) => {
                const id = getRowId(row, index)
                return {
                    id,
                    row,
                    selectable: selectionEnabled && !selectionDisabled && isRowSelectable(row),
                }
            }),
        [visibleRows, getRowId, selectionEnabled, selectionDisabled, isRowSelectable],
    )

    const selectableVisibleIds = useMemo(
        () => visibleRowMeta.filter((meta) => meta.selectable).map((meta) => meta.id),
        [visibleRowMeta],
    )

    const selectedVisibleRows = useMemo(
        () => visibleRowMeta.filter((meta) => selectedIdsSet.has(meta.id)).map((meta) => meta.row),
        [visibleRowMeta, selectedIdsSet],
    )

    const allVisibleSelected =
        selectableVisibleIds.length > 0 && selectableVisibleIds.every((id) => selectedIdsSet.has(id))
    const someVisibleSelected =
        selectableVisibleIds.length > 0 && selectableVisibleIds.some((id) => selectedIdsSet.has(id)) && !allVisibleSelected

    const columnCount = useMemo(
        () => columns.length + (actions ? 1 : 0) + (selectionEnabled ? 1 : 0),
        [columns, actions, selectionEnabled],
    )

    return (
        <section
            className={cn("flex flex-col gap-4", className)}
            style={
                maxWidth
                    ? {
                        maxWidth: typeof maxWidth === "number" ? `${maxWidth}px` : maxWidth,
                    }
                    : undefined
            }
        >
            <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
                <div className="w-full flex gap-2 sm:gap-3 sm:items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">Hiển thị</span>
                        <select
                            value={query.limit}
                            onChange={(event) => handleLimitChange(Number(event.target.value))}
                            className="h-8 sm:h-9 rounded-md border border-input bg-background px-2 text-xs sm:text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            disabled={isPending}
                            aria-label="Chọn số bản ghi mỗi trang"
                        >
                            {availableLimits.map((option) => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-6 sm:gap-2 flex-wrap">
                        {columns.some((col) => col.filter) && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setShowFilters((prev) => !prev)}
                                disabled={isPending}
                                aria-label={showFilters ? "Ẩn bộ lọc" : "Hiện bộ lọc"}
                                className="h-8 px-2 sm:px-3"
                            >
                                {showFilters ? (
                                    <>
                                        <EyeOff className="h-5 w-5 sm:mr-2" />
                                        <span className="inline">Ẩn bộ lọc</span>
                                    </>
                                ) : (
                                    <>
                                        <Eye className="h-5 w-5 sm:mr-2" />
                                        <span className="inline">Hiện bộ lọc</span>
                                    </>
                                )}
                            </Button>
                        )}
                        {showClearFilters && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleResetFilters}
                                disabled={isPending}
                                className="h-8 px-2 sm:px-3 text-xs sm:text-sm"
                            >
                                <span className="inline">Xóa bộ lọc</span>
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {selectionEnabled && selectionActions && selectedIdsSet.size > 0 ? (
                <div className="min-w-[100px] rounded-lg border border-border/80 bg-muted/40 p-2 sm:p-3">
                    {selectionActions({
                        selectedIds: Array.from(selectedIdsSet),
                        selectedRows: selectedVisibleRows,
                        clearSelection,
                    })}
                </div>
            ) : null}

            <div className="rounded-md border overflow-x-auto relative">
                {/* Loading overlay khi đang fetch data */}
                {isPending && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-md">
                        <div className="flex flex-col items-center gap-3">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                            <span className="text-sm font-medium text-foreground">Đang tải dữ liệu...</span>
                        </div>
                    </div>
                )}
                <div className="min-w-full inline-block">
                    <Table className="min-w-full">
                    <TableHeader>
                        <TableRow>
                            {selectionEnabled ? (
                                <TableHead className="w-10 max-w-10 min-w-10 align-middle px-2 sticky left-0 z-10 bg-background border-r border-border">
                                    <SelectionCheckbox
                                        checked={allVisibleSelected}
                                        indeterminate={someVisibleSelected}
                                        disabled={selectionDisabled || selectableVisibleIds.length === 0}
                                        onCheckedChange={(checked) => handleToggleAll(selectableVisibleIds, checked)}
                                    />
                                </TableHead>
                            ) : null}
                            {columns.map((column) => (
                                <TableHead
                                    key={`header-${column.accessorKey}`}
                                    className={cn("align-middle whitespace-nowrap px-2 sm:px-3", column.headerClassName)}
                                >
                                    <span className="text-xs sm:text-sm font-medium text-foreground">{column.header}</span>
                                </TableHead>
                            ))}
                            {actions ? (
                                <TableHead className="min-w-[100px] text-center px-2 sm:px-3 sticky right-0 z-10 bg-background border-l border-border">
                                    <span className="text-xs sm:text-sm">Hành động</span>
                                </TableHead>
                            ) : null}
                        </TableRow>
                        {columns.some((col) => col.filter) && showFilters && (
                            <TableRow className="border-t border-border bg-muted/40">
                                {selectionEnabled ? <TableHead className="w-10 max-w-10 min-w-10 bg-muted/40 px-1 sm:px-3" /> : null}
                                {columns.map((column) => (
                                    <TableHead
                                        key={`filter-${column.accessorKey}`}
                                        className={cn("min-w-[100px] align-middle bg-muted/40 whitespace-nowrap px-2 sm:px-3", column.headerClassName)}
                                    >
                                        <ColumnFilterControl
                                            column={column}
                                            value={pendingTextFilters[column.accessorKey] ?? ""}
                                            disabled={isPending}
                                            onChange={(value, immediate) => handleFilterChange(column.accessorKey, value, immediate)}
                                        />
                                    </TableHead>
                                ))}
                                {actions ? <TableHead className="min-w-[100px] text-center px-2 sm:px-3 sticky right-0 z-10 border-l border-border" /> : null}
                            </TableRow>
                        )}
                    </TableHeader>
                    <Suspense fallback={<TableBodySkeleton columnCount={columnCount} rowCount={fallbackRowCount} />}>
                        <TableBodyContent<T>
                            dataPromise={dataPromise}
                            columns={columns}
                            actions={actions}
                            showSelection={selectionEnabled}
                            selectionDisabled={selectionDisabled}
                            selectedIds={selectedIdsSet}
                            isRowSelectable={isRowSelectable}
                            onToggleRow={handleRowToggle}
                            getRowId={getRowId}
                            onVisibleRowsChange={setVisibleRows}
                            emptyMessage={emptyMessage}
                            totalColumns={columnCount}
                        />
                    </Suspense>
                </Table>
                </div>
            </div>

            <Suspense fallback={<SummarySkeleton />}>
                <TableSummary
                    dataPromise={dataPromise}
                    isPending={isPending}
                    onPageChange={handlePageChange}
                />
            </Suspense>
        </section>
    )
}

function safeLoad<T extends object>(
    loader: DataTableLoader<T>,
    query: DataTableQueryState,
): Promise<DataTableResult<T>> {
    return loader(query).catch((error) => {
        console.error("[DataTable] Failed to load data", error)
        return {
            rows: [],
            page: query.page,
            limit: query.limit,
            total: 0,
            totalPages: 0,
        }
    })
}

interface TableBodyContentProps<T extends object> {
    dataPromise: Promise<DataTableResult<T>>
    columns: DataTableColumn<T>[]
    actions?: (row: T) => ReactNode
    showSelection: boolean
    selectionDisabled: boolean
    selectedIds: Set<string>
    isRowSelectable: (row: T) => boolean
    onToggleRow: (row: T, rowId: string, checked: boolean) => void
    getRowId: (row: T, index: number) => string
    onVisibleRowsChange?: (rows: T[]) => void
    emptyMessage: string
    totalColumns: number
}

function TableBodyContent<T extends object>({
    dataPromise,
    columns,
    actions,
    showSelection,
    selectionDisabled,
    selectedIds,
    isRowSelectable,
    onToggleRow,
    getRowId,
    onVisibleRowsChange,
    emptyMessage,
    totalColumns,
}: TableBodyContentProps<T>) {
    const result = use(dataPromise)
    useEffect(() => {
        onVisibleRowsChange?.(result.rows)
    }, [result.rows, onVisibleRowsChange])

    if (!result.rows.length) {
        return (
            <TableBody>
                <TableRow>
                    <TableCell colSpan={totalColumns} className="py-10 text-center text-sm text-muted-foreground">
                        {emptyMessage}
                    </TableCell>
                </TableRow>
            </TableBody>
        )
    }

    return (
        <TableBody>
            {result.rows.map((row, index) => {
                const rowId = getRowId(row, index)
                const rowSelectable = isRowSelectable(row)
                const rowSelected = selectedIds.has(rowId)
                return (
                    <TableRow key={rowId} className="group">
                        {showSelection ? (
                            <TableCell className="w-10 max-w-10 min-w-10 align-middle px-2 sticky left-0 z-10 bg-background group-data-[state=selected]:bg-muted border-r border-border">
                                <SelectionCheckbox
                                    checked={rowSelected}
                                    indeterminate={false}
                                    disabled={selectionDisabled || !rowSelectable}
                                    onCheckedChange={(checked) => onToggleRow(row, rowId, checked)}
                                />
                            </TableCell>
                        ) : null}
                        {columns.map((column) => {
                            const rawValue = (row as UnknownRecord)[column.accessorKey]
                            const hasCustomWidth = column.className?.includes("max-w-") || column.className?.includes("min-w-")
                            return (
                                    <TableCell key={column.accessorKey} className={cn("px-2 sm:px-3 break-words", !hasCustomWidth && "max-w-[300px]", column.className)}>
                                    {column.cell
                                        ? column.cell(row)
                                        : rawValue == null
                                            ? "-"
                                            : typeof rawValue === "string" || typeof rawValue === "number"
                                                ? rawValue
                                                : Array.isArray(rawValue)
                                                    ? rawValue.join(", ")
                                                    : JSON.stringify(rawValue)}
                                </TableCell>
                            )
                        })}
                        {actions ? <TableCell className="min-w-[100px] text-center whitespace-nowrap px-2 sm:px-3 sticky right-0 z-10 bg-background group-data-[state=selected]:bg-muted border-l border-border">{actions(row)}</TableCell> : null}
                    </TableRow>
                )
            })}
        </TableBody>
    )
}

interface TableSummaryProps<T extends object> {
    dataPromise: Promise<DataTableResult<T>>
    isPending: boolean
    onPageChange: (nextPage: number, totalPages?: number) => void
}

function TableSummary<T extends object>({
    dataPromise,
    isPending,
    onPageChange,
}: TableSummaryProps<T>) {
    const result = use(dataPromise)
    const hasResults = result.total > 0
    const startIndex = hasResults ? (result.page - 1) * result.limit + 1 : 0
    const endIndex = hasResults ? Math.min(result.page * result.limit, result.total) : 0
    const totalPages = result.totalPages || 1

    return (
        <div className="flex flex-col sm:flex-row flex-wrap items-center justify-between gap-2 sm:gap-3 border-t border-border px-2 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm text-muted-foreground">
            <div className="text-center sm:text-left">
                <span className="hidden sm:inline">Hiển thị {startIndex}-{endIndex} trong {result.total} kết quả</span>
                <span className="sm:hidden">{startIndex}-{endIndex} / {result.total}</span>
            </div>
            <div className="flex items-center gap-6 sm:gap-2">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(result.page - 1, totalPages)}
                    disabled={isPending || result.page <= 1}
                    className="h-8 px-2 sm:px-3"
                >
                    <ChevronLeft className="h-5 w-5 sm:mr-2" />
                    <span className="hidden sm:inline">Trước</span>
                </Button>
                <span className="min-w-[80px] sm:min-w-[100px] text-center text-xs sm:text-sm">
                    <span className="hidden sm:inline">Trang </span>
                    {totalPages === 0 ? 0 : result.page} / {Math.max(totalPages, 1)}
                </span>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(result.page + 1, totalPages)}
                    disabled={isPending || result.page >= totalPages}
                    className="h-8 px-2 sm:px-3"
                >
                    <span className="hidden sm:inline">Sau</span>
                    <ChevronRight className="h-5 w-5 sm:ml-2" />
                </Button>
            </div>
        </div>
    )
}

interface TableBodySkeletonProps {
    columnCount: number
    rowCount?: number
}

function TableBodySkeleton({ columnCount, rowCount = 5 }: TableBodySkeletonProps) {
    return (
        <TableBody>
            {Array.from({ length: rowCount }).map((_, rowIndex) => (
                <TableRow key={`skeleton-row-${rowIndex}`} className="animate-pulse">
                    {Array.from({ length: columnCount }).map((__, cellIndex) => (
                        <TableCell key={`skeleton-cell-${rowIndex}-${cellIndex}`}>
                            <Skeleton className="h-6 w-full" />
                        </TableCell>
                    ))}
                </TableRow>
            ))}
        </TableBody>
    )
}

function SummarySkeleton() {
    return (
        <div className="flex items-center justify-between gap-3 border-t border-border px-2 py-4">
            <Skeleton className="h-5 w-58" />
            <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-20" />
            </div>
        </div>
    )
}

interface SelectionCheckboxProps {
    checked: boolean
    indeterminate: boolean
    disabled?: boolean
    onCheckedChange: (checked: boolean) => void
}

function SelectionCheckbox({ checked, indeterminate, disabled, onCheckedChange }: SelectionCheckboxProps) {
    const ref = useRef<HTMLInputElement>(null)
    useEffect(() => {
        if (ref.current) {
            ref.current.indeterminate = indeterminate
        }
    }, [indeterminate, checked])

    return (
        <input
            ref={ref}
            type="checkbox"
            className="h-6 w-6 rounded border-border text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            checked={checked}
            disabled={disabled}
            onChange={(event) => {
                event.stopPropagation()
                onCheckedChange(event.target.checked)
            }}
        />
    )
}
