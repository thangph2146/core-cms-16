"use client"

import { FieldContent, FieldError } from "@/components/ui/field"
import { SelectCombobox } from "./customs/select-combobox"
import type { ResourceFormField } from "../resource-form"

interface SelectFieldProps<T> {
  field: ResourceFormField<T> 
  fieldValue: unknown
  error?: string
  onChange: (value: unknown) => void
  isPending?: boolean
}
export function SelectField<T>({
  field,
  fieldValue,
  error,
  onChange,
  isPending = false,
}: SelectFieldProps<T>) {
  const fieldId = field.name as string
  const errorId = error ? `${fieldId}-error` : undefined

  return (
    <FieldContent>
      <SelectCombobox
        field={field}
        fieldValue={fieldValue}
        error={error}
        onChange={onChange}
        isPending={isPending}
        fieldId={fieldId}
        errorId={errorId}
      />
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </FieldContent>
  )
}

