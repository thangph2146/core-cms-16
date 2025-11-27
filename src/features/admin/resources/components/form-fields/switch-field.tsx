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

  return (
    <FieldContent>
      <Switch
        id={field.name as string}
        checked={Boolean(fieldValue)}
        onCheckedChange={(checked) => onChange(checked)}
        disabled={field.disabled || isPending}
        aria-invalid={error ? "true" : "false"}
        aria-label={field.label}
      />
      {error && <FieldError>{error}</FieldError>}
    </FieldContent>
  )
}

