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

  return (
    <FieldContent>
      <Input
        id={field.name as string}
        name={field.name as string}
        type="date"
        value={fieldValue ? String(fieldValue).split("T")[0] : ""}
        onChange={(e) => onChange(e.target.value)}
        required={field.required}
        disabled={field.disabled || isPending}
        aria-invalid={error ? "true" : "false"}
        className={error ? "border-destructive" : ""}
      />
      {error && <FieldError>{error}</FieldError>}
    </FieldContent>
  )
}

