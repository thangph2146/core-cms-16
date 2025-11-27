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

  return (
    <FieldContent>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id={field.name as string}
          name={field.name as string}
          checked={Boolean(fieldValue)}
          onChange={(e) => onChange(e.target.checked)}
          disabled={field.disabled || isPending}
          aria-invalid={error ? "true" : "false"}
          className={cn(
            "h-5 w-5 rounded border border-input",
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
}

