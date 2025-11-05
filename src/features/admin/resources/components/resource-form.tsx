"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Save, ArrowLeft, X, Check, ChevronsUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
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
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

export interface ResourceFormField<T = unknown> {
  name: keyof T | string
  label: string
  description?: string
  type?: "text" | "email" | "password" | "number" | "textarea" | "select" | "checkbox" | "switch" | "date"
  placeholder?: string
  required?: boolean
  disabled?: boolean
  defaultValue?: unknown
  options?: Array<{ label: string; value: string | number }>
  render?: (field: ResourceFormField<T>, value: unknown, onChange: (value: unknown) => void) => React.ReactNode
  validate?: (value: unknown) => { valid: boolean; error?: string }
}

export interface ResourceFormProps<T extends Record<string, unknown>> {
  // Data
  data: T | null
  fields: ResourceFormField<T>[]
  
  // Config
  title?: string
  description?: string
  submitLabel?: string
  cancelLabel?: string
  backUrl?: string
  backLabel?: string
  
  // Handlers
  onSubmit: (data: Partial<T>) => Promise<{ success: boolean; error?: string }>
  onCancel?: () => void
  onSuccess?: () => void
  
  // UI
  className?: string
  formClassName?: string
  contentClassName?: string
  showCard?: boolean
  
  // Dialog/Sheet mode
  variant?: "page" | "dialog" | "sheet"
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ResourceForm<T extends Record<string, unknown>>({
  data,
  fields,
  title,
  description,
  submitLabel = "Lưu",
  cancelLabel = "Hủy",
  backUrl,
  backLabel = "Quay lại",
  onSubmit,
  onCancel,
  onSuccess,
  className,
  formClassName,
  contentClassName,
  showCard = true,
  variant = "page",
  open = true,
  onOpenChange,
}: ResourceFormProps<T>) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [formData, setFormData] = useState<Partial<T>>(() => {
    const initial: Partial<T> = {}
    fields.forEach((field) => {
      const key = field.name as keyof T
      initial[key] = (data?.[key] ?? field.defaultValue) as T[keyof T]
    })
    return initial
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)

  const handleFieldChange = (fieldName: string, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    } as Partial<T>))
    // Clear error for this field
    if (errors[fieldName]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[fieldName]
        return next
      })
    }
    setSubmitError(null)
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    fields.forEach((field) => {
      const fieldName = String(field.name)
      const value = formData[field.name as keyof T]
      
      // Required check
      if (field.required && (value === undefined || value === null || value === "")) {
        newErrors[fieldName] = `${field.label} là bắt buộc`
        return
      }

      // Custom validation
      if (field.validate && value !== undefined && value !== null && value !== "") {
        const validation = field.validate(value)
        if (!validation.valid && validation.error) {
          newErrors[fieldName] = validation.error
        }
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    if (!validateForm()) {
      return
    }

    startTransition(async () => {
      try {
        const result = await onSubmit(formData)
        if (result.success) {
          onSuccess?.()
          if (variant === "page") {
            router.refresh()
          } else {
            onOpenChange?.(false)
          }
        } else {
          setSubmitError(result.error ?? "Đã xảy ra lỗi khi lưu")
        }
      } catch (error) {
        setSubmitError(error instanceof Error ? error.message : "Đã xảy ra lỗi khi lưu")
      }
    })
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    } else if (variant === "dialog" || variant === "sheet") {
      onOpenChange?.(false)
    } else if (backUrl) {
      router.push(backUrl)
    }
  }

  // Select Combobox Component
  const SelectCombobox = ({ 
    field, 
    fieldValue, 
    error 
  }: { 
    field: ResourceFormField<T>
    fieldValue: unknown
    error?: string
  }) => {
    const [selectOpen, setSelectOpen] = useState(false)
    
    if (!field.options || field.options.length === 0) {
      return (
        <div className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground">
          Không có tùy chọn
        </div>
      )
    }

    const selectedOption = field.options.find((opt) => String(opt.value) === String(fieldValue))

    return (
      <Popover open={selectOpen} onOpenChange={setSelectOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={selectOpen}
            className={cn(
              "w-full justify-between h-10",
              !fieldValue && "text-muted-foreground",
              error && "border-destructive"
            )}
            disabled={field.disabled || isPending}
          >
            <span className="truncate">
              {selectedOption ? selectedOption.label : field.placeholder || "-- Chọn --"}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Tìm kiếm..." className="h-9" />
            <CommandList>
              <CommandEmpty>Không tìm thấy.</CommandEmpty>
              <CommandGroup>
                {!field.required && (
                  <CommandItem
                    value=""
                    onSelect={() => {
                      handleFieldChange(field.name as string, "")
                      setSelectOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        !fieldValue || fieldValue === "" ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {field.placeholder || "-- Chọn --"}
                  </CommandItem>
                )}
                {field.options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={String(option.value)}
                    onSelect={() => {
                      handleFieldChange(field.name as string, option.value)
                      setSelectOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        String(fieldValue) === String(option.value) ? "opacity-100" : "opacity-0"
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

  const renderFieldInput = (field: ResourceFormField<T>) => {
    const value = formData[field.name as keyof T]
    const fieldName = String(field.name)
    const error = errors[fieldName]
    const fieldValue = value ?? field.defaultValue ?? ""

    // Custom render - wrap in FieldContent to ensure consistency
    if (field.render) {
      const customContent = field.render(field, fieldValue, (newValue) => handleFieldChange(field.name as string, newValue))
      return (
        <FieldContent>
          {customContent}
          {error && <FieldError>{error}</FieldError>}
        </FieldContent>
      )
    }

    // All inputs must be wrapped in FieldContent
    switch (field.type) {
      case "textarea":
        return (
          <FieldContent>
            <textarea
              id={field.name as string}
              name={field.name as string}
              value={String(fieldValue)}
              onChange={(e) => handleFieldChange(field.name as string, e.target.value)}
              placeholder={field.placeholder}
              required={field.required}
              disabled={field.disabled || isPending}
              aria-invalid={error ? "true" : "false"}
              className={cn(
                "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
                "placeholder:text-muted-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-50",
                error && "border-destructive"
              )}
            />
            {error && <FieldError>{error}</FieldError>}
          </FieldContent>
        )

      case "select":
        return (
          <FieldContent>
            <SelectCombobox field={field} fieldValue={fieldValue} error={error} />
            {error && <FieldError>{error}</FieldError>}
          </FieldContent>
        )

      case "checkbox":
        return (
          <FieldContent>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id={field.name as string}
                name={field.name as string}
                checked={Boolean(fieldValue)}
                onChange={(e) => handleFieldChange(field.name as string, e.target.checked)}
                disabled={field.disabled || isPending}
                aria-invalid={error ? "true" : "false"}
                className={cn(
                  "h-4 w-4 rounded border border-input",
                  error && "border-destructive"
                )}
              />
              <Label htmlFor={field.name as string} className="text-sm font-normal">
                {field.label}
              </Label>
            </div>
            {error && <FieldError>{error}</FieldError>}
          </FieldContent>
        )

      case "switch":
        return (
          <FieldContent>
            <Switch
              id={field.name as string}
              checked={Boolean(fieldValue)}
              onCheckedChange={(checked) => handleFieldChange(field.name as string, checked)}
              disabled={field.disabled || isPending}
              aria-invalid={error ? "true" : "false"}
              aria-label={field.label}
            />
            {error && <FieldError>{error}</FieldError>}
          </FieldContent>
        )

      case "number":
        return (
          <FieldContent>
            <Input
              id={field.name as string}
              name={field.name as string}
              type="number"
              value={String(fieldValue)}
              onChange={(e) => handleFieldChange(field.name as string, Number(e.target.value))}
              placeholder={field.placeholder}
              required={field.required}
              disabled={field.disabled || isPending}
              aria-invalid={error ? "true" : "false"}
              className={error ? "border-destructive" : ""}
            />
            {error && <FieldError>{error}</FieldError>}
          </FieldContent>
        )

      case "date":
        return (
          <FieldContent>
            <Input
              id={field.name as string}
              name={field.name as string}
              type="date"
              value={fieldValue ? String(fieldValue).split("T")[0] : ""}
              onChange={(e) => handleFieldChange(field.name as string, e.target.value)}
              required={field.required}
              disabled={field.disabled || isPending}
              aria-invalid={error ? "true" : "false"}
              className={error ? "border-destructive" : ""}
            />
            {error && <FieldError>{error}</FieldError>}
          </FieldContent>
        )

      default:
        return (
          <FieldContent>
            <Input
              id={field.name as string}
              name={field.name as string}
              type={field.type ?? "text"}
              value={String(fieldValue)}
              onChange={(e) => handleFieldChange(field.name as string, e.target.value)}
              placeholder={field.placeholder}
              required={field.required}
              disabled={field.disabled || isPending}
              aria-invalid={error ? "true" : "false"}
              className={error ? "border-destructive" : ""}
            />
            {error && <FieldError>{error}</FieldError>}
          </FieldContent>
        )
    }
  }

  const formContent = (
    <form id="resource-form" onSubmit={handleSubmit} className={cn("space-y-6", formClassName)}>
      {submitError && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {submitError}
        </div>
      )}

      <div 
        className={cn("grid gap-6", contentClassName)}
        data-grid-responsive="true"
      >
        {fields.map((field) => {
          const fieldName = String(field.name)
          const isFullWidth = field.type === "textarea" || field.type === "select" || field.render
          
          if (field.type === "checkbox") {
            return (
              <div 
                key={fieldName} 
                className={cn(
                  "min-w-0",
                  isFullWidth && "@md:col-span-full"
                )}
                style={isFullWidth ? undefined : {
                  minWidth: "200px"
                }}
              >
                <Field>
                  {renderFieldInput(field)}
                  {field.description && (
                    <FieldDescription>{field.description}</FieldDescription>
                  )}
                </Field>
              </div>
            )
          }

          return (
            <div 
              key={fieldName} 
              className={cn(
                "min-w-0",
                isFullWidth && "@md:col-span-full"
              )}
              style={isFullWidth ? undefined : {
                minWidth: "200px"
              }}
            >
              <Field orientation="responsive">
                <FieldLabel htmlFor={fieldName}>
                  {field.label}
                  {field.required && <span className="text-destructive">*</span>}
                </FieldLabel>
                {renderFieldInput(field)}
                {field.description && (
                  <FieldDescription>{field.description}</FieldDescription>
                )}
              </Field>
            </div>
          )
        })}
      </div>
    </form>
  )


  const footer = (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={handleCancel}
        disabled={isPending}
      >
        {variant === "page" && backUrl ? (
          <>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {cancelLabel}
          </>
        ) : (
          <>
            <X className="mr-2 h-4 w-4" />
            {cancelLabel}
          </>
        )}
      </Button>
      <Button type="submit" form="resource-form" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Đang lưu...
          </>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            {submitLabel}
          </>
        )}
      </Button>
    </>
  )

  // Dialog mode
  if (variant === "dialog") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl w-full flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          <ScrollArea className="max-h-[calc(60dvh)] overflow-y-auto">
            <div className="px-6 py-4">
              {formContent}
            </div>
          </ScrollArea>
          <DialogFooter className="px-6 pb-6 pt-4 border-t">{footer}</DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  // Sheet mode
  if (variant === "sheet") {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="flex flex-col">
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
            {description && <SheetDescription>{description}</SheetDescription>}
          </SheetHeader>
          <ScrollArea className="flex-1 -mx-6 px-6 mt-6">
            <div className="pr-4">
              {formContent}
            </div>
          </ScrollArea>
          <SheetFooter className="mt-6 border-t pt-4">{footer}</SheetFooter>
        </SheetContent>
      </Sheet>
    )
  }

  // Page mode
  const formElement = showCard ? (
    <Card className={className}>
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent className={title || description ? undefined : "pt-6"}>
        {formContent}
      </CardContent>
    </Card>
  ) : (
    <div className={className}>
      {formContent}
    </div>
  )

  return (
    <div className={cn("flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8 max-w-4xl mx-auto w-full", className)}>
      {/* Header */}
      {(title || backUrl) && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border/50">
          <div className="space-y-1.5 flex-1 min-w-0">
            {backUrl && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(backUrl)}
                className="-ml-2"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {backLabel}
              </Button>
            )}
            {title && !showCard && (
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h1>
            )}
            {description && !showCard && (
              <p className="text-sm text-muted-foreground max-w-2xl">{description}</p>
            )}
          </div>
        </div>
      )}

      {/* Form */}
      {formElement}

      {/* Footer Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t">
        {footer}
      </div>
    </div>
  )
}

