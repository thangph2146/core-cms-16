"use client"

import { FieldContent, FieldError } from "@/components/ui/field"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import type { ResourceFormField } from "../resource-form"

interface CheckboxFieldProps<T> {
  field: ResourceFormField<T>
  value: unknown
  error?: string
  onChange: (value: unknown) => void
  isPending?: boolean
}

export function CheckboxField<T>({
  field,
  value,
  error,
  onChange,
  isPending = false,
}: CheckboxFieldProps<T>) {
  const fieldValue = value ?? false
  const fieldId = field.name as string
  const errorId = error ? `${fieldId}-error` : undefined

  return (
    <FieldContent>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id={fieldId}
          name={fieldId}
          checked={Boolean(fieldValue)}
          onChange={(e) => onChange(e.target.checked)}
          disabled={field.disabled || isPending}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={errorId || field.description ? `${fieldId}-description` : undefined}
          className={cn(
            "h-5 w-5 rounded border border-input",
            error && "border-destructive"
          )}
        />
        <Label htmlFor={fieldId} className="text-sm font-normal">
          {field.label}
        </Label>
      </div>
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </FieldContent>
  )
}

