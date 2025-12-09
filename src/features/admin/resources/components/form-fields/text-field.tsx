"use client"

import * as React from "react"
import { Eye, EyeOff } from "lucide-react"
import { FieldContent, FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ResourceFormField } from "../resource-form"

interface TextFieldProps<T> {
  field: ResourceFormField<T>
  value: unknown
  error?: string
  onChange: (value: unknown) => void
  isPending?: boolean
}

export function TextField<T>({
  field,
  value,
  error,
  onChange,
  isPending = false,
}: TextFieldProps<T>) {
  const fieldValue = value ?? ""
  const isPassword = field.type === "password"
  const [showPassword, setShowPassword] = React.useState(false)
  const fieldId = field.name as string
  const errorId = error ? `${fieldId}-error` : undefined

  return (
    <FieldContent>
      <div className="relative">
        <Input
          id={fieldId}
          name={fieldId}
          type={isPassword && !showPassword ? "password" : "text"}
          value={String(fieldValue)}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          required={field.required}
          disabled={field.disabled || isPending}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={errorId || field.description ? `${fieldId}-description` : undefined}
          className={cn(
            error && "border-destructive",
            isPassword && "pr-10"
          )}
        />
        {isPassword && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={() => setShowPassword(!showPassword)}
            disabled={field.disabled || isPending}
            aria-label={showPassword ? "Ẩn mật khẩu" : "Hiển thị mật khẩu"}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Eye className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        )}
      </div>
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </FieldContent>
  )
}

