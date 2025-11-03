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
import { ChevronLeft, ChevronRight, Check, ChevronsUpDown, Eye, EyeOff, Search } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
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

type UnknownRecord = Record<string, unknown>

interface ColumnFilterSelectOption {
    label: string
    value: string
}

type ColumnFilterConfig =
    | {
        type?: "text"
        placeholder?: string
    }
    | {
        type: "select"
        options: ColumnFilterSelectOption[]
        placeholder?: string
    }
    | {
        type: "date"
        placeholder?: string
        dateFormat?: string
        enableTime?: boolean
        showSeconds?: boolean
    }
    | {
        type: "command"
        options: ColumnFilterSelectOption[]
        placeholder?: string
        searchPlaceholder?: string
        emptyMessage?: string
    }


interface ColumnFilterControlProps<T extends object = object> {
    column: DataTableColumn<T>
    value: string
    disabled: boolean
    onChange: (value: string, immediate?: boolean) => void
}

function ColumnFilterControl<T extends object = object>({ column, value, disabled, onChange }: ColumnFilterControlProps<T>) {
    // Command filter needs state for popover, so we handle it separately
    if (column.filter?.type === "command") {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const [open, setOpen] = useState(false)
        const selectedOption = column.filter.options.find((opt) => opt.value === value)

        return (
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className={cn(
                            "h-8 w-full justify-between text-xs font-normal",
                            !value && "text-muted-foreground",
                        )}
                        disabled={disabled}
                    >
                        <span className="truncate">
                            {selectedOption ? selectedOption.label : column.filter.placeholder ?? "Chọn..."}
                        </span>
                        <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0" align="start">
                    <Command>
                        <CommandInput
                            placeholder={column.filter.searchPlaceholder ?? "Tìm kiếm..."}
                            className="h-9"
                        />
                        <CommandList>
                            <CommandEmpty>
                                {column.filter.emptyMessage ?? "Không tìm thấy."}
                            </CommandEmpty>
                            <CommandGroup>
                                <CommandItem
                                    value=""
                                    onSelect={() => {
                                        onChange("", true)
                                        setOpen(false)
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-3 w-3",
                                            value === "" ? "opacity-100" : "opacity-0",
                                        )}
                                    />
                                    {column.filter.placeholder ?? "Tất cả"}
                                </CommandItem>
                                {column.filter.options.map((option) => (
                                    <CommandItem
                                        key={option.value}
                                        value={option.value}
                                        onSelect={() => {
                                            onChange(option.value === value ? "" : option.value, true)
                                            setOpen(false)
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-3 w-3",
                                                value === option.value ? "opacity-100" : "opacity-0",
                                            )}
                                        />
                                        {option.label}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        )
    }

    if (!column.filter) return null

    if (column.filter.type === "select") {
        return (
            <select
                value={value}
                onChange={(event) => onChange(event.target.value, true)}
                disabled={disabled}
                className={cn(
                    "h-8 w-full rounded-md border border-input bg-background px-2 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring",
                    "disabled:cursor-not-allowed disabled:opacity-60",
                )}
                aria-label={`Lọc ${column.header}`}
            >
                <option value="">{column.filter.placeholder ?? "Tất cả"}</option>
                {column.filter.options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        )
    }

    if (column.filter.type === "date") {
        let dateValue: Date | undefined
        try {
            if (value && value.trim()) {
                const parsed = new Date(value)
                if (!isNaN(parsed.getTime())) {
                    dateValue = parsed
                }
            }
        } catch {
            dateValue = undefined
        }
        const dateFormat = column.filter.dateFormat
        const enableTime = column.filter.enableTime ?? false
        const showSeconds = column.filter.showSeconds ?? false

        // Determine default format based on enableTime and showSeconds
        const defaultDateFormat = enableTime
            ? showSeconds
                ? "dd/MM/yyyy HH:mm:ss"
                : "dd/MM/yyyy HH:mm"
            : "dd/MM/yyyy"

        // Determine output format for filter value
        const getOutputFormat = () => {
            if (enableTime) {
                return showSeconds ? "yyyy-MM-dd'T'HH:mm:ss" : "yyyy-MM-dd'T'HH:mm"
            }
            return "yyyy-MM-dd"
        }

        return (
            <DatePicker
                date={dateValue}
                onDateChange={(date) => {
                    if (date) {
                        onChange(format(date, getOutputFormat()), true)
                    } else {
                        onChange("", true)
                    }
                }}
                placeholder={column.filter.placeholder ?? (enableTime ? "Chọn ngày giờ" : "Chọn ngày")}
                dateFormat={dateFormat ?? defaultDateFormat}
                disabled={disabled}
                enableTime={enableTime}
                showSeconds={showSeconds}
            />
        )
    }


    return (
        <Input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={column.filter?.placeholder ?? `Lọc ${column.header.toLowerCase()}...`}
            className="h-8 text-xs"
            disabled={disabled}
        />
    )
}

export interface DataTableColumn<T extends object> {
    accessorKey: keyof T & string
    header: string
    cell?: (row: T) => ReactNode
    filter?: ColumnFilterConfig
    className?: string
    headerClassName?: string
}

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

const DEFAULT_LIMIT_OPTIONS = [10, 20, 50]
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    maxHeight: _maxHeight,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    const initialQueryRef = useRef(defaultQuery)
    const hasConsumedInitialRef = useRef(!initialData)

    const [dataPromise, setDataPromise] = useState<Promise<DataTableResult<T>>>(() =>
        initialData ? Promise.resolve(initialData) : safeLoad(loader, defaultQuery),
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

    useEffect(() => {
        startTransition(() => {
            const shouldUseInitial =
                Boolean(initialData) &&
                !hasConsumedInitialRef.current &&
                areQueriesEqual(query, initialQueryRef.current)

            if (shouldUseInitial && initialData) {
                setDataPromise(Promise.resolve(initialData))
                hasConsumedInitialRef.current = true
                return
            }

            setDataPromise(safeLoad(loader, query))
        })
    }, [loader, query, refreshKey, initialData])

    const hasAppliedFilters =
        query.search.trim().length > 0 ||
        Object.values(query.filters).some((value) => value && value.trim().length > 0)
    const hasPendingFilters = Object.values(pendingTextFilters).some((value) => value && value.trim().length > 0)
    const showClearFilters = hasAppliedFilters || hasPendingFilters

    const [searchInput, setSearchInput] = useState("")
    
    const updateSearchQuery = useCallback((value: string) => {
        setQuery((prev) => ({
            ...prev,
            page: 1,
            search: value,
        }))
    }, [])
    
    const debouncedSearch = useDebouncedCallback(updateSearchQuery, 300)

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
        debouncedSearch.cancel()
        setPendingTextFilters({})
        setSearchInput("")
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
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="w-full flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative min-w-[240px] max-w-sm flex-1">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Tìm kiếm..."
                            value={searchInput}
                            onChange={(event) => {
                                const value = event.target.value
                                setSearchInput(value)
                                debouncedSearch(value)
                            }}
                            onBlur={() => {
                                debouncedSearch.cancel()
                                updateSearchQuery(searchInput)
                            }}
                            className="h-9 pl-8"
                            disabled={isPending}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Hiển thị</span>
                        <select
                            value={query.limit}
                            onChange={(event) => handleLimitChange(Number(event.target.value))}
                            className="h-9 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
                    <div className="flex items-center gap-2">
                        {columns.some((col) => col.filter) && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setShowFilters((prev) => !prev)}
                                disabled={isPending}
                                aria-label={showFilters ? "Ẩn bộ lọc" : "Hiện bộ lọc"}
                            >
                                {showFilters ? (
                                    <>
                                        <EyeOff className="mr-2 h-4 w-4" />
                                        Ẩn bộ lọc
                                    </>
                                ) : (
                                    <>
                                        <Eye className="mr-2 h-4 w-4" />
                                        Hiện bộ lọc
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
                            >
                                Xóa bộ lọc
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {selectionEnabled && selectionActions && selectedIdsSet.size > 0 ? (
                <div className="rounded-lg border border-border/80 bg-muted/40 p-3">
                    {selectionActions({
                        selectedIds: Array.from(selectedIdsSet),
                        selectedRows: selectedVisibleRows,
                        clearSelection,
                    })}
                </div>
            ) : null}

            <div className="rounded-md border overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            {selectionEnabled ? (
                                <TableHead className="w-10 align-middle">
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
                                    className={cn("align-middle", column.headerClassName)}
                                >
                                    <span className="text-sm font-medium text-foreground">{column.header}</span>
                                </TableHead>
                            ))}
                            {actions ? (
                                <TableHead className="w-[120px] text-right">Hành động</TableHead>
                            ) : null}
                        </TableRow>
                        {columns.some((col) => col.filter) && showFilters && (
                            <TableRow className="border-t border-border bg-muted/40">
                                {selectionEnabled ? <TableHead className="w-10 bg-muted/40" /> : null}
                                {columns.map((column) => (
                                    <TableHead
                                        key={`filter-${column.accessorKey}`}
                                        className={cn("align-middle bg-muted/40", column.headerClassName)}
                                    >
                                        <ColumnFilterControl
                                            column={column}
                                            value={pendingTextFilters[column.accessorKey] ?? ""}
                                            disabled={isPending}
                                            onChange={(value, immediate) => handleFilterChange(column.accessorKey, value, immediate)}
                                        />
                                    </TableHead>
                                ))}
                                {actions ? <TableHead className="w-[120px] bg-muted/40" /> : null}
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
                    <TableRow key={rowId}>
                        {showSelection ? (
                            <TableCell className="w-10 align-middle">
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
                            return (
                                <TableCell key={column.accessorKey} className={column.className}>
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
                        {actions ? <TableCell className="text-right">{actions(row)}</TableCell> : null}
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
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-2 py-4 text-sm text-muted-foreground">
            <div>
                Hiển thị {startIndex}-{endIndex} trong {result.total} kết quả
            </div>
            <div className="flex items-center gap-2">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(result.page - 1, totalPages)}
                    disabled={isPending || result.page <= 1}
                >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Trước
                </Button>
                <span className="min-w-[100px] text-center">
                    Trang {totalPages === 0 ? 0 : result.page} / {Math.max(totalPages, 1)}
                </span>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(result.page + 1, totalPages)}
                    disabled={isPending || result.page >= totalPages}
                >
                    Sau
                    <ChevronRight className="ml-2 h-4 w-4" />
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
            <Skeleton className="h-4 w-48" />
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
            className="h-4 w-4 rounded border-border text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            checked={checked}
            disabled={disabled}
            onChange={(event) => {
                event.stopPropagation()
                onCheckedChange(event.target.checked)
            }}
        />
    )
}
