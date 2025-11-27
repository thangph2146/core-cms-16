"use client"

import { useEffect, useRef, useState } from "react"
import { FieldContent, FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { generateSlug } from "@/lib/utils/generate-slug"
import type { ResourceFormField } from "../resource-form"

interface SlugFieldProps<T> {
  field: ResourceFormField<T>
  value: unknown
  error?: string
  onChange: (value: unknown) => void
  isPending?: boolean
  sourceValue?: unknown // Giá trị của source field (như title) để auto-generate
}

export function SlugField<T>({
  field,
  value,
  error,
  onChange,
  isPending = false,
  sourceValue,
}: SlugFieldProps<T>) {
  const fieldValue = typeof value === "string" ? value : ""
  const [slugValue, setSlugValue] = useState<string>(fieldValue)
  const slugManuallyEditedRef = useRef<boolean>(false)
  const previousSourceValueRef = useRef<string | null>(null)
  const isInitialMountRef = useRef<boolean>(true)

  // Sync với external value changes (khi data mới được load)
  useEffect(() => {
    if (fieldValue !== slugValue && !slugManuallyEditedRef.current) {
      setSlugValue(fieldValue)
      // Reset manual edit flag when value changes from outside (e.g., new data loaded)
      if (fieldValue) {
        slugManuallyEditedRef.current = false
      }
    }
  }, [fieldValue, slugValue])

  // Auto-generate slug từ source field (như title)
  useEffect(() => {
    const sourceStr = typeof sourceValue === "string" ? sourceValue : ""
    
    // On initial mount, set previous value to current source value
    // This prevents auto-generation on mount when editing existing data
    if (isInitialMountRef.current) {
      previousSourceValueRef.current = sourceStr || null
      isInitialMountRef.current = false
      // If slug is empty but source has value, generate slug on initial mount
      if (!slugValue && sourceStr.trim()) {
        const generatedSlug = generateSlug(sourceStr)
        if (generatedSlug) {
          setSlugValue(generatedSlug)
          onChange(generatedSlug)
        }
      }
      return
    }
    
    // Only auto-generate if:
    // 1. Not manually edited
    // 2. Source value exists and is not empty
    // 3. Source value has changed from previous
    if (
      !slugManuallyEditedRef.current &&
      sourceStr.trim() &&
      sourceStr !== previousSourceValueRef.current
    ) {
      const generatedSlug = generateSlug(sourceStr)
      if (generatedSlug && generatedSlug !== slugValue) {
        setSlugValue(generatedSlug)
        onChange(generatedSlug)
      }
      previousSourceValueRef.current = sourceStr
    } else if (sourceStr !== previousSourceValueRef.current) {
      // Update previous value even if not generating
      previousSourceValueRef.current = sourceStr || null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceValue])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    // Only mark as manually edited if user actually changes the value
    // (not just when field is focused)
    if (newValue !== slugValue) {
      slugManuallyEditedRef.current = true
    }
    setSlugValue(newValue)
    onChange(newValue)
  }

  return (
    <FieldContent>
      <Input
        id={field.name as string}
        name={field.name as string}
        type="text"
        value={slugValue}
        onChange={handleChange}
        placeholder={field.placeholder}
        required={field.required}
        disabled={field.disabled || isPending}
        aria-invalid={error ? "true" : "false"}
        className={error ? "border-destructive" : ""}
      />
      {error && <FieldError>{error}</FieldError>}
    </FieldContent>
  )
}

