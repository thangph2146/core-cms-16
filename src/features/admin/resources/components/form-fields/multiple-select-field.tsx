"use client"

import { FieldContent, FieldError } from "@/components/ui/field"
import { MultipleSelectCombobox } from "./customs/multiple-select-combobox"
import type { ResourceFormField } from "../resource-form"

interface MultipleSelectFieldProps<T> {
  field: ResourceFormField<T> 
  fieldValue: unknown
  error?: string
  onChange: (value: unknown) => void
  isPending?: boolean
}

export function MultipleSelectField<T>({
  field,
  fieldValue,
  error,
  onChange,
  isPending = false,
}: MultipleSelectFieldProps<T>) {
  const fieldId = field.name as string
  const errorId = error ? `${fieldId}-error` : undefined

  return (
    <FieldContent>
      <MultipleSelectCombobox
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

