"use client"

import { FieldContent, FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import type { ResourceFormField } from "../resource-form"

interface DateFieldProps<T> {
  field: ResourceFormField<T>
  value: unknown
  error?: string
  onChange: (value: unknown) => void
  isPending?: boolean
}

export function DateField<T>({
  field,
  value,
  error,
  onChange,
  isPending = false,
}: DateFieldProps<T>) {
  const fieldValue = value ?? ""
  const fieldId = field.name as string
  const errorId = error ? `${fieldId}-error` : undefined

  return (
    <FieldContent>
      <Input
        id={fieldId}
        name={fieldId}
        type="date"
        value={fieldValue ? String(fieldValue).split("T")[0] : ""}
        onChange={(e) => onChange(e.target.value)}
        required={field.required}
        disabled={field.disabled || isPending}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={errorId || field.description ? `${fieldId}-description` : undefined}
        className={error ? "border-destructive" : ""}
      />
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </FieldContent>
  )
}

