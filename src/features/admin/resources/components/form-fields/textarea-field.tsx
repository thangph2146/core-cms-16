"use client"

import { FieldContent, FieldError } from "@/components/ui/field"
import { cn } from "@/lib/utils"
import type { ResourceFormField } from "../resource-form"

interface TextareaFieldProps<T> {
  field: ResourceFormField<T>
  value: unknown
  error?: string
  onChange: (value: unknown) => void
  isPending?: boolean
}

export function TextareaField<T>({
  field,
  value,
  error,
  onChange,
  isPending = false,
}: TextareaFieldProps<T>) {
  const fieldValue = value ?? ""
  const fieldId = field.name as string
  const errorId = error ? `${fieldId}-error` : undefined

  return (
    <FieldContent>
      <textarea
        id={fieldId}
        name={fieldId}
        value={String(fieldValue)}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        required={field.required}
        disabled={field.disabled || isPending}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={errorId || field.description ? `${fieldId}-description` : undefined}
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-destructive"
        )}
      />
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </FieldContent>
  )
}

