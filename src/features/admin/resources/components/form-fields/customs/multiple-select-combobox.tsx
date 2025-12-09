"use client"

import { useState } from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { cn } from "@/lib/utils"
import type { ResourceFormField } from "../../resource-form"

interface MultipleSelectComboboxProps<T> {
  field: ResourceFormField<T>
  fieldValue: unknown
  error?: string
  onChange: (value: unknown) => void
  isPending?: boolean
  fieldId?: string
  errorId?: string
}

export function MultipleSelectCombobox<T>({
  field,
  fieldValue,
  error,
  onChange,
  isPending = false,
  fieldId,
  errorId,
}: MultipleSelectComboboxProps<T>) {
  const [selectOpen, setSelectOpen] = useState(false)

  const selectedValues = Array.isArray(fieldValue) 
    ? fieldValue.map(v => String(v))
    : fieldValue !== null && fieldValue !== undefined && fieldValue !== ""
      ? [String(fieldValue)]
      : []

  // Get all options from groups or flat options
  const allOptions = field.optionGroups
    ? field.optionGroups.flatMap((group) => group.options)
    : field.options || []

  if (allOptions.length === 0) {
    return (
      <div className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground">
        Không có tùy chọn
      </div>
    )
  }

  const selectedOptions = allOptions.filter((opt) => 
    selectedValues.includes(String(opt.value))
  )

  const allSelected = allOptions.length > 0 && selectedValues.length === allOptions.length

  const handleToggle = (optionValue: string | number) => {
    const valueStr = String(optionValue)
    const currentValues = selectedValues
    
    if (currentValues.includes(valueStr)) {
      // Remove if already selected
      const newValues = currentValues.filter(v => v !== valueStr)
      onChange(newValues.length > 0 ? newValues : [])
    } else {
      // Add if not selected
      onChange([...currentValues, valueStr])
    }
  }

  const handleSelectAll = () => {
    const allValues = allOptions.map(opt => String(opt.value))
    onChange(allValues)
  }

  const handleDeselectAll = () => {
    onChange([])
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange([])
  }

  const displayText = selectedOptions.length > 0
    ? `${selectedOptions.length} mục đã chọn`
    : field.placeholder || "-- Chọn --"

  return (
    <Popover open={selectOpen} onOpenChange={setSelectOpen}>
      <PopoverTrigger asChild>
        <Button
          id={fieldId || field.name as string}
          variant="outline"
          role="combobox"
          aria-expanded={selectOpen}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={errorId || field.description ? `${fieldId || field.name as string}-description` : undefined}
          className={cn(
            "w-full justify-between h-auto min-h-10 px-3 py-2",
            selectedValues.length === 0 && "text-muted-foreground",
            error && "border-destructive"
          )}
          disabled={field.disabled || isPending}
        >
          <div className="flex flex-1 flex-wrap gap-1.5 items-center min-w-0">
            {selectedOptions.length > 0 ? (
              selectedOptions.length <= 3 ? (
                // Show badges if <= 3 items
                selectedOptions.map((option) => (
                  <Badge
                    key={option.value}
                    variant="secondary"
                    className="mr-0 text-xs"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleToggle(option.value)
                    }}
                  >
                    {option.label}
                    <X className="ml-1.5 h-3 w-3" />
                  </Badge>
                ))
              ) : (
                // Show count if > 3 items
                <span className="text-sm">{displayText}</span>
              )
            ) : (
              <span className="text-sm">{displayText}</span>
            )}
          </div>
          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
            {selectedValues.length > 0 && (
              <X
                className="h-4 w-4 text-muted-foreground hover:text-foreground"
                onClick={handleClear}
              />
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Tìm kiếm..." className="h-9" />
          <CommandList>
            <CommandEmpty>Không tìm thấy.</CommandEmpty>
            {field.optionGroups ? (
              <>
                {/* Select All option for grouped options */}
                {allOptions.length > 0 && (
                  <CommandGroup>
                    <CommandItem
                      value="select-all"
                      onSelect={() => {
                        if (allSelected) {
                          handleDeselectAll()
                        } else {
                          handleSelectAll()
                        }
                      }}
                      className={cn(
                        "font-medium border rounded-md",
                        allSelected && "text-primary"
                      )}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-5 w-5",
                          allSelected ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {allSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                    </CommandItem>
                  </CommandGroup>
                )}
                {field.optionGroups.map((group) => (
                  <CommandGroup key={group.label} heading={group.label}>
                    {group.options.map((option) => {
                      const isSelected = selectedValues.includes(String(option.value))
                      return (
                        <CommandItem
                          key={`${group.label}-${option.value}`}
                          value={String(option.value)}
                          onSelect={() => handleToggle(option.value)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-5 w-5",
                              isSelected ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {option.label}
                        </CommandItem>
                      )
                    })}
                  </CommandGroup>
                ))}
              </>
            ) : (
              <CommandGroup>
                {/* Select All option for flat options */}
                {allOptions.length > 0 && (
                  <CommandItem
                    value="select-all"
                    onSelect={() => {
                      if (allSelected) {
                        handleDeselectAll()
                      } else {
                        handleSelectAll()
                      }
                    }}
                    className={cn(
                      "font-medium",
                      allSelected && "text-primary"
                    )}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-5 w-5",
                        allSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {allSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                  </CommandItem>
                )}
                {allOptions.map((option) => {
                  const isSelected = selectedValues.includes(String(option.value))
                  return (
                    <CommandItem
                      key={option.value}
                      value={String(option.value)}
                      onSelect={() => handleToggle(option.value)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-5 w-5",
                          isSelected ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {option.label}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            )}
            {selectedValues.length > 0 && (
              <CommandGroup>
                <CommandItem
                  value="clear-all"
                  onSelect={() => onChange([])}
                  className="text-destructive"
                >
                  Xóa tất cả
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

