/**
 * Command Filter Component (Single select với search)
 */
"use client"

import { useState, useId, useCallback } from "react"
import { Check, ChevronsUpDown, X, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import { useClientOnly } from "@/hooks/use-client-only"
import type { ColumnFilterControlProps } from "../types"

export function CommandCombobox<T extends object = object>({
    column,
    value,
    disabled,
    onChange,
}: ColumnFilterControlProps<T>) {
    const [open, setOpen] = useState(false)
    const [searchValue, setSearchValue] = useState("")
    const [isSearching, setIsSearching] = useState(false)
    const mounted = useClientOnly()
    const filterId = useId()

    const onSearchChange = column.filter && "onSearchChange" in column.filter ? column.filter.onSearchChange : undefined
    const isLoading = column.filter && "isLoading" in column.filter ? column.filter.isLoading : false

    const handleSearchChange = useCallback(
        (query: string) => {
            setSearchValue(query)
            setIsSearching(query.length > 0)
            onSearchChange?.(query)
        },
        [onSearchChange]
    )

    const handleClearSearch = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation()
            setSearchValue("")
            setIsSearching(false)
            onSearchChange?.("")
        },
        [onSearchChange]
    )

    if (!column.filter || !("options" in column.filter)) return null

    const options = column.filter.options
    const selectedOption = options.find((opt) => opt.value === value)

    if (!mounted) {
        return (
            <Button
                variant="outline"
                role="combobox"
                className={cn("h-7 sm:h-8 w-full justify-between text-xs font-normal", !value && "text-muted-foreground")}
                disabled={true}
            >
                <span className="truncate text-xs">
                    {selectedOption ? selectedOption.label : column.filter.placeholder ?? "Chọn..."}
                </span>
                <ChevronsUpDown className="ml-1 sm:ml-2 h-3 w-3 shrink-0 opacity-50" />
            </Button>
        )
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    aria-controls={filterId}
                    className={cn("h-7 sm:h-8 w-full justify-between text-xs font-normal", !value && "text-muted-foreground")}
                    disabled={disabled}
                >
                    <span className="truncate text-xs">
                        {selectedOption ? selectedOption.label : column.filter.placeholder ?? "Chọn..."}
                    </span>
                    <ChevronsUpDown className="ml-1 sm:ml-2 h-3 w-3 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent id={filterId} className="w-[200px] p-0" align="start">
                <Command 
                    shouldFilter={!onSearchChange}
                    // Ngăn chặn tự động select option khi nhấn Enter trong search
                    // Chỉ cho phép select khi user click vào option
                    onKeyDown={(e) => {
                        // Ngăn chặn Enter key khi đang search để tránh tự động select option đầu tiên
                        if (e.key === "Enter" && isSearching && searchValue.trim().length > 0) {
                            e.preventDefault()
                            e.stopPropagation()
                        }
                    }}
                >
                    <div className="relative">
                        <CommandInput
                            placeholder={column.filter.searchPlaceholder ?? "Tìm kiếm..."}
                            className="h-9 pr-8"
                            value={searchValue}
                            onValueChange={handleSearchChange}
                        />
                        {searchValue && (
                            <button
                                type="button"
                                onClick={handleClearSearch}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        )}
                        {isLoading && searchValue && (
                            <div className="absolute right-8 top-1/2 -translate-y-1/2">
                                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                            </div>
                        )}
                    </div>
                    <CommandList>
                        {isLoading && options.length === 0 ? (
                            <div className="flex items-center justify-center py-6">
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <CommandEmpty>{column.filter.emptyMessage ?? "Không tìm thấy."}</CommandEmpty>
                        )}
                        <CommandGroup>
                            <CommandItem
                                value=""
                                onSelect={() => {
                                    setIsSearching(false)
                                    setSearchValue("")
                                    onSearchChange?.("")
                                    onChange("", true)
                                    setOpen(false)
                                }}
                            >
                                <Check className={cn("mr-2 h-3 w-3", value === "" ? "opacity-100" : "opacity-0")} />
                                {column.filter.placeholder ?? "Tất cả"}
                            </CommandItem>
                            {options.map((option) => (
                                <CommandItem
                                    key={option.value}
                                    value={option.value}
                                    onSelect={() => {
                                        setIsSearching(false)
                                        setSearchValue("")
                                        onSearchChange?.("")
                                        onChange(option.value === value ? "" : option.value, true)
                                        setOpen(false)
                                    }}
                                >
                                    <Check className={cn("mr-2 h-3 w-3", value === option.value ? "opacity-100" : "opacity-0")} />
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

