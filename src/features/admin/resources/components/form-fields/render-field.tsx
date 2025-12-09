"use client"

import { FieldContent, FieldError } from "@/components/ui/field"
import { TextField } from "./text-field"
import { TextareaField } from "./textarea-field"
import { NumberField } from "./number-field"
import { DateField } from "./date-field"
import { CheckboxField } from "./checkbox-field"
import { SwitchField } from "./switch-field"
import { SelectField } from "./select-field"
import { MultipleSelectField } from "./multiple-select-field"
import { ImageField } from "./image-field"
import { EditorField } from "./editor-field"
import { SlugField } from "./slug-field"
import type { ResourceFormField } from "../resource-form"

interface RenderFieldProps<T> {
  field: ResourceFormField<T>
  value: unknown
  error?: string
  onChange: (value: unknown) => void
  isPending?: boolean
  sourceValue?: unknown // Giá trị của source field để auto-generate slug
}

export function renderFieldInput<T>({
  field,
  value,
  error,
  onChange,
  isPending = false,
  sourceValue,
}: RenderFieldProps<T>) {
  // Default value for multiple-select should be array
  const defaultValue = field.type === "multiple-select" 
    ? (field.defaultValue ?? [])
    : (field.defaultValue ?? "")
  
  const fieldValue = value !== undefined && value !== null 
    ? value 
    : defaultValue

  // Custom render - wrap in FieldContent to ensure consistency
  if (field.render) {
    const customContent = field.render(field, fieldValue, onChange)
    return (
      <FieldContent>
        {customContent}
        {error && <FieldError>{error}</FieldError>}
      </FieldContent>
    )
  }

  // Render based on field type
  switch (field.type) {
    case "textarea":
      return (
        <TextareaField
          field={field}
          value={fieldValue}
          error={error}
          onChange={onChange}
          isPending={isPending}
        />
      )

    case "select":
      return (
        <SelectField
          field={field}
          fieldValue={fieldValue}
          error={error}
          onChange={onChange}
          isPending={isPending}
        />
      )

    case "multiple-select":
      return (
        <MultipleSelectField
          field={field}
          fieldValue={fieldValue}
          error={error}
          onChange={onChange}
          isPending={isPending}
        />
      )

    case "checkbox":
      return (
        <CheckboxField
          field={field}
          value={fieldValue}
          error={error}
          onChange={onChange}
          isPending={isPending}
        />
      )

    case "switch":
      return (
        <SwitchField
          field={field}
          value={fieldValue}
          error={error}
          onChange={onChange}
          isPending={isPending}
        />
      )

    case "number":
      return (
        <NumberField
          field={field}
          value={fieldValue}
          error={error}
          onChange={onChange}
          isPending={isPending}
        />
      )

    case "date":
      return (
        <DateField
          field={field}
          value={fieldValue}
          error={error}
          onChange={onChange}
          isPending={isPending}
        />
      )

    case "image":
      return (
        <ImageField
          value={fieldValue}
          onChange={onChange}
          placeholder={field.placeholder}
          error={error}
          disabled={field.disabled || isPending}
          fieldId={field.name as string}
        />
      )

    case "editor":
      return (
        <EditorField
          value={fieldValue}
          onChange={onChange}
          error={error}
          disabled={field.disabled || isPending}
        />
      )

    case "slug":
      return (
        <SlugField
          field={field}
          value={fieldValue}
          onChange={onChange}
          error={error}
          isPending={isPending}
          sourceValue={sourceValue}
        />
      )

    default:
      // text, email, password
      return (
        <TextField
          field={field}
          value={fieldValue}
          error={error}
          onChange={onChange}
          isPending={isPending}
        />
      )
  }
}

