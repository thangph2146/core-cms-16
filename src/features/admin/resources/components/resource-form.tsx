"use client"

import { useState, useEffect, useRef } from "react"
import { useResourceSegment } from "@/hooks/use-resource-segment"
import { useResourceNavigation, useResourceFormLogger } from "../hooks"
import { logger } from "@/lib/config/logger"
import { Loader2, Save, ArrowLeft, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field"
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
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { renderFieldInput } from "./form-fields"
import { applyResourceSegmentToPath } from "@/lib/permissions"

export interface ResourceFormField<T = unknown> {
  name: keyof T | string
  label: string
  description?: string
  type?: "text" | "email" | "password" | "number" | "textarea" | "select" | "multiple-select" | "checkbox" | "switch" | "date" | "image" | "editor" | "slug"
  sourceField?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  defaultValue?: unknown
  options?: Array<{ label: string; value: string | number }>
  optionGroups?: Array<{ label: string; options: Array<{ label: string; value: string | number }> }>
  icon?: React.ReactNode
  render?: (field: ResourceFormField<T>, value: unknown, onChange: (value: unknown) => void) => React.ReactNode
  validate?: (value: unknown) => { valid: boolean; error?: string }
  section?: string
}

export interface ResourceFormSection {
  id: string
  title?: string
  description?: string
}

export interface ResourceFormProps<T extends Record<string, unknown>> {
  data: T | null
  fields: ResourceFormField<T>[]
  sections?: ResourceFormSection[]
  
  title?: string
  description?: string
  submitLabel?: string
  cancelLabel?: string
  backUrl?: string
  backLabel?: string
  
  onSubmit: (data: Partial<T>) => Promise<{ success: boolean; error?: string }>
  onCancel?: () => void
  onSuccess?: () => void
  onBack?: () => void | Promise<void>
  
  // UI
  className?: string
  formClassName?: string
  contentClassName?: string
  showCard?: boolean
  
  // Dialog/Sheet mode
  variant?: "page" | "dialog" | "sheet"
  open?: boolean
  onOpenChange?: (open: boolean) => void
  
  resourceName?: string
  resourceId?: string
  action?: "create" | "update"
}

export function ResourceForm<T extends Record<string, unknown>>({
  data,
  fields,
  sections,
  title,
  description,
  submitLabel = "Lưu",
  cancelLabel = "Hủy",
  backUrl,
  backLabel = "Quay lại",
  onSubmit,
  onCancel,
  onSuccess,
  onBack,
  className,
  formClassName,
  contentClassName,
  showCard = true,
  variant = "page",
  open = true,
  onOpenChange,
  resourceName,
  resourceId,
  action,
}: ResourceFormProps<T>) {
  const resourceSegment = useResourceSegment()
  const resolvedBackUrl = backUrl ? applyResourceSegmentToPath(backUrl, resourceSegment) : undefined
  const { navigateBack, router } = useResourceNavigation()
  
  const handleBack = async () => {
    if (resolvedBackUrl) {
      await navigateBack(resolvedBackUrl, onBack)
    }
  }
  const [isPending, setIsPending] = useState(false)
  const [formData, setFormData] = useState<Partial<T>>(() => {
    const initial: Partial<T> = {}
    fields.forEach((field) => {
      const key = field.name as keyof T
      const dataValue = data?.[key]
      
      if (dataValue !== undefined && dataValue !== null) {
        initial[key] = dataValue as T[keyof T]
      } else if (field.defaultValue !== undefined) {
        initial[key] = field.defaultValue as T[keyof T]
      } else if (field.type === "multiple-select") {
        initial[key] = [] as T[keyof T]
      } else if (field.type === "checkbox" || field.type === "switch") {
        initial[key] = false as T[keyof T]
      } else if (field.type !== "number") {
        initial[key] = "" as T[keyof T]
      }
    })
    return initial
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const detectedAction: "create" | "update" = action || (data?.id ? "update" : "create")
  const detectedResourceId = resourceId || (data?.id as string | undefined)
  const detectedResourceName = resourceName || "resource"

  useEffect(() => {
    if (!data) return

    setFormData((prev) => {
      const updated: Partial<T> = { ...prev }
      let hasChanges = false

      fields.forEach((field) => {
        const key = field.name as keyof T
        const dataValue = data[key]
        const currentValue = prev[key]
        if (field.type === "multiple-select") {
          // Multiple-select: luôn là array
          const newValue = Array.isArray(dataValue) 
            ? dataValue 
            : (dataValue !== undefined && dataValue !== null ? [dataValue] : [])
          
          // So sánh array
          const currentArray = Array.isArray(currentValue) ? currentValue : []
          if (JSON.stringify(newValue) !== JSON.stringify(currentArray)) {
            updated[key] = newValue as T[keyof T]
            hasChanges = true
          }
        } else if (field.type === "checkbox" || field.type === "switch") {
          const newValue = dataValue !== undefined && dataValue !== null ? Boolean(dataValue) : false
          if (newValue !== currentValue) {
            updated[key] = newValue as T[keyof T]
            hasChanges = true
          }
        } else if (field.type === "number") {
          if (dataValue !== undefined && dataValue !== null) {
            const newValue = typeof dataValue === "number" ? dataValue : Number(dataValue)
            if (newValue !== currentValue && !isNaN(newValue)) {
              updated[key] = newValue as T[keyof T]
              hasChanges = true
            }
          }
        } else {
          if (dataValue !== undefined) {
            const newValue = dataValue === null ? "" : dataValue
            
            // So sánh để tránh update không cần thiết
            if (Array.isArray(newValue) && Array.isArray(currentValue)) {
              if (JSON.stringify(newValue) !== JSON.stringify(currentValue)) {
                updated[key] = newValue as T[keyof T]
                hasChanges = true
              }
            } else if (newValue !== currentValue) {
              updated[key] = newValue as T[keyof T]
              hasChanges = true
            }
          } else if (currentValue === undefined && field.type !== undefined) {
            updated[key] = "" as T[keyof T]
            hasChanges = true
          }
        }
      })

      return hasChanges ? updated : prev
    })
  }, [data, fields])

  useResourceFormLogger({
    resourceName: detectedResourceName,
    resourceId: detectedResourceId,
    action: detectedAction,
    formData: formData as T | null,
    isSubmitting: isPending,
    submitSuccess,
    submitError,
  })

  const handleFieldChange = (fieldName: string, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    } as Partial<T>))
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
      
      if (!field.required) {
        if (field.validate && value !== undefined && value !== null && value !== "") {
          const validation = field.validate(value)
          if (!validation.valid && validation.error) {
            newErrors[fieldName] = validation.error
          }
        }
        return
      }

      const hasValue = field.name in formData
      let isEmpty = false

      if (!hasValue) {
        isEmpty = true
      } else if (field.type === "multiple-select") {
        isEmpty = !Array.isArray(value) || value.length === 0
      } else if (field.type === "select") {
        isEmpty = value === undefined || value === null || value === ""
      } else if (field.type === "checkbox" || field.type === "switch") {
        isEmpty = value !== true
      } else if (field.type === "number") {
        isEmpty = value === undefined || value === null || (typeof value === "number" && isNaN(value))
      } else {
        isEmpty = value === undefined || value === null || value === ""
      }

      if (isEmpty) {
        newErrors[fieldName] = `${field.label} là bắt buộc`
        return
      }

      if (field.validate) {
        const validation = field.validate(value)
        if (!validation.valid && validation.error) {
          newErrors[fieldName] = validation.error
        }
      }
    })

    setErrors(newErrors)
    
    if (Object.keys(newErrors).length > 0) {
      const firstErrorField = Object.keys(newErrors)[0]
      scrollToField(firstErrorField)
    }
    
    return Object.keys(newErrors).length === 0
  }

  const scrollToField = (fieldName: string) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const fieldElement = document.getElementById(fieldName)
        if (!fieldElement) {
          const fieldByName = document.querySelector(`[name="${fieldName}"]`) as HTMLElement
          if (!fieldByName) return
          fieldByName.scrollIntoView({ behavior: "smooth", block: "center" })
          fieldByName.focus()
          return
        }

        let scrollContainer: HTMLElement | null = null
        
        if (variant === "dialog") {
          const dialog = fieldElement.closest('[role="dialog"]')
          scrollContainer = dialog?.querySelector('[data-slot="scroll-area-viewport"]') as HTMLElement | null
        } else if (variant === "sheet") {
          const sheet = fieldElement.closest('[data-state]')
          scrollContainer = sheet?.querySelector('[data-slot="scroll-area-viewport"]') as HTMLElement | null
        } else {
          const form = fieldElement.closest('form')
          if (form) {
            let parent = form.parentElement
            while (parent && parent !== document.body) {
              const overflow = window.getComputedStyle(parent).overflowY
              if (overflow === "auto" || overflow === "scroll") {
                scrollContainer = parent
                break
              }
              parent = parent.parentElement
            }
          }
        }

        if (scrollContainer) {
          const elementRect = fieldElement.getBoundingClientRect()
          const containerRect = scrollContainer.getBoundingClientRect()
          const scrollTop = scrollContainer.scrollTop + (elementRect.top - containerRect.top) - 20
          scrollContainer.scrollTo({ top: Math.max(0, scrollTop), behavior: "smooth" })
        } else {
          fieldElement.scrollIntoView({ behavior: "smooth", block: "center" })
        }

        setTimeout(() => {
          const input = fieldElement.querySelector<HTMLElement>("input, textarea, select, [role='combobox']")
          if (input) {
            input.focus()
            if (input instanceof HTMLElement) {
              input.scrollIntoView({ behavior: "smooth", block: "nearest" })
            }
          }
        }, 100)
      })
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    if (!validateForm()) {
      return
    }

    setIsPending(true)
    setSubmitSuccess(false)
    setSubmitError(null)
    try {
      const result = await onSubmit(formData)
      if (result.success) {
        setSubmitSuccess(true)
        onSuccess?.()
        if (variant === "page") {
          if (onOpenChange) {
            onOpenChange(false)
          }
        } else {
          onOpenChange?.(false)
        }
      } else {
        setSubmitError(result.error ?? "Đã xảy ra lỗi khi lưu")
        setSubmitSuccess(false)
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Đã xảy ra lỗi khi lưu")
      setSubmitSuccess(false)
    } finally {
      setIsPending(false)
    }
  }

  const handleCancel = () => {
    logger.info("❌ Cancel button clicked", {
      source: "form-cancel-button",
      variant,
      hasOnCancel: !!onCancel,
      hasResolvedBackUrl: !!resolvedBackUrl,
      resourceName,
      resourceId,
      action,
      currentPath: typeof window !== "undefined" ? window.location.pathname : undefined,
    })

    if (onCancel) {
      logger.debug("📞 Gọi onCancel callback")
      onCancel()
    } else if (variant === "dialog" || variant === "sheet") {
      logger.debug("🚪 Đóng dialog/sheet")
      onOpenChange?.(false)
    } else if (resolvedBackUrl) {
      logger.debug("➡️ Navigate về backUrl từ cancel button", {
        backUrl: resolvedBackUrl,
      })
      navigateBack(resolvedBackUrl, onBack).catch(() => {
        logger.warn("⚠️ NavigateBack failed, fallback to router.replace", {
          backUrl: resolvedBackUrl,
        })
        router.replace(resolvedBackUrl)
      })
    }
  }

  const groupFieldsBySection = () => {
    const grouped: Record<string, ResourceFormField<T>[]> = {}
    const ungrouped: ResourceFormField<T>[] = []

    fields.forEach((field) => {
      if (field.section) {
        if (!grouped[field.section]) {
          grouped[field.section] = []
        }
        grouped[field.section].push(field)
      } else {
        ungrouped.push(field)
      }
    })

    return { grouped, ungrouped }
  }

  const renderField = (field: ResourceFormField<T>) => {
    const fieldName = String(field.name)
    const value = formData[field.name as keyof T]
    const error = errors[fieldName]
    const sourceValue = field.sourceField ? formData[field.sourceField as keyof T] : undefined
    const fullWidthTypes = ["textarea", "select", "image", "editor", "slug"]
    const isFullWidth = fullWidthTypes.includes(field.type || "") || !!field.render
    const isEditorField = field.type === "editor"

    if (field.type === "checkbox") {
      return (
        <div
          key={fieldName}
          id={fieldName}
          className={cn(
            "min-w-0",
            isEditorField ? "col-span-full" : (isFullWidth && "@md:col-span-full")
          )}
          style={isFullWidth ? undefined : {
            minWidth: "200px"
          }}
        >
          <Field>
            {field.icon && (
              <FieldLabel htmlFor={fieldName}>
                {field.icon}
                {field.label}
                {field.required && <span className="text-destructive">*</span>}
              </FieldLabel>
            )}
            {renderFieldInput({
              field,
              value,
              error,
              onChange: (newValue) => handleFieldChange(field.name as string, newValue),
              isPending,
              sourceValue,
            })}
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
        id={fieldName}
        className={cn(
          "min-w-0",
          isEditorField ? "col-span-full" : (isFullWidth && "@md:col-span-full")
        )}
        style={isFullWidth ? undefined : {
          minWidth: "200px"
        }}
      >
        <Field orientation="responsive">
          <FieldLabel htmlFor={fieldName}>
            {field.icon}
            {field.label}
            {field.required && <span className="text-destructive">*</span>}
          </FieldLabel>
          {renderFieldInput({
            field,
            value,
            error,
            onChange: (newValue) => handleFieldChange(field.name as string, newValue),
            isPending,
            sourceValue,
          })}
          {field.description && (
            <FieldDescription>{field.description}</FieldDescription>
          )}
        </Field>
      </div>
    )
  }

  const renderSection = (sectionId: string, sectionFields: ResourceFormField<T>[]) => {
    const sectionInfo = sections?.find((s) => s.id === sectionId)
    const fieldCount = sectionFields.length
    const gridClass = fieldCount === 1 
      ? "grid-cols-1" 
      : fieldCount === 2 
        ? "grid-cols-1 @md:grid-cols-2" 
        : "grid-cols-1"
    const gridResponsiveAttr = fieldCount > 2 ? "auto-fit" : "true"

    return (
      <div key={sectionId} className="space-y-4">
        {(sectionInfo?.title || sectionInfo?.description) && (
          <div className="space-y-1.5 pb-2 border-b border-border/50">
            {sectionInfo.title && (
              <h3 className="text-base font-semibold">{sectionInfo.title}</h3>
            )}
            {sectionInfo.description && (
              <p className="text-sm text-muted-foreground">{sectionInfo.description}</p>
            )}
          </div>
        )}
        <div
          className={cn("grid gap-6", gridClass)}
          data-grid-responsive={gridResponsiveAttr}
        >
          {sectionFields.map(renderField)}
        </div>
      </div>
    )
  }

  const { grouped, ungrouped } = groupFieldsBySection()

  const formContent = (
    <form id="resource-form" ref={formRef} onSubmit={handleSubmit} className={cn("space-y-6", formClassName)}>
      {submitError && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {submitError}
        </div>
      )}

      <div className={cn("space-y-6", contentClassName)}>
        {/* Render sections */}
        {Object.entries(grouped).map(([sectionId, sectionFields]) =>
          renderSection(sectionId, sectionFields)
        )}

        {/* Render ungrouped fields */}
        {ungrouped.length > 0 && (
          <div
            className={cn("grid gap-6", contentClassName)}
            data-grid-responsive="true"
          >
            {ungrouped.map(renderField)}
          </div>
        )}
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
        {variant === "page" && resolvedBackUrl ? (
          <>
            <ArrowLeft className="mr-2 h-5 w-5" />
            {cancelLabel}
          </>
        ) : (
          <>
            <X className="mr-2 h-5 w-5" />
            {cancelLabel}
          </>
        )}
      </Button>
      <Button type="submit" form="resource-form" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Đang lưu...
          </>
        ) : (
          <>
            <Save className="mr-2 h-5 w-5" />
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
    <div className={cn("flex flex-1 flex-col gap-6 mx-auto w-full max-w-[100%]", className)}>
      {/* Header */}
      {(title || resolvedBackUrl) && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border/50">
          <div className="space-y-1.5 flex-1 min-w-0">
            {resolvedBackUrl && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
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

