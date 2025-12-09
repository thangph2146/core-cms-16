"use client"

import { FieldContent, FieldError } from "@/components/ui/field"
import { Switch } from "@/components/ui/switch"
import type { ResourceFormField } from "../resource-form"

interface SwitchFieldProps<T> {
  field: ResourceFormField<T>
  value: unknown
  error?: string
  onChange: (value: unknown) => void
  isPending?: boolean
}

export function SwitchField<T>({
  field,
  value,
  error,
  onChange,
  isPending = false,
}: SwitchFieldProps<T>) {
  const fieldValue = value ?? false
  const fieldId = field.name as string
  const errorId = error ? `${fieldId}-error` : undefined

  return (
    <FieldContent>
      <Switch
        id={fieldId}
        checked={Boolean(fieldValue)}
        onCheckedChange={(checked) => onChange(checked)}
        disabled={field.disabled || isPending}
        aria-invalid={error ? "true" : "false"}
        aria-label={field.label}
        aria-describedby={errorId || field.description ? `${fieldId}-description` : undefined}
      />
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </FieldContent>
  )
}

