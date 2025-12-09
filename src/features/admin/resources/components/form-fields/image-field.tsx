/**
 * Image Field Component
 * Follows Shadcn accessibility patterns
 */
"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { FieldContent, FieldError } from "@/components/ui/field"
import { ImageIcon, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { cn } from "@/lib/utils"

export interface ImageFieldProps {
  value: unknown
  onChange: (value: unknown) => void
  placeholder?: string
  error?: string
  disabled?: boolean
  fieldId?: string
}

export function ImageField({
  value,
  onChange,
  placeholder = "https://example.com/image.jpg",
  error,
  disabled = false,
  fieldId = "image",
}: ImageFieldProps) {
  const imageUrl = typeof value === "string" ? value : ""
  const hasImage = imageUrl && imageUrl.trim() !== ""
  const [imageError, setImageError] = useState(false)
  const errorId = error ? `${fieldId}-error` : undefined

  return (
    <FieldContent>
      <div className="space-y-4">
        <div className="flex gap-2">
          <Input
            id={fieldId}
            type="text"
            value={imageUrl}
            onChange={(e) => {
              onChange(e.target.value)
              setImageError(false)
            }}
            placeholder={placeholder}
            className={cn("flex-1", error && "border-destructive")}
            disabled={disabled}
            aria-invalid={error ? "true" : "false"}
            aria-describedby={errorId}
          />
          {hasImage && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => {
                onChange("")
                setImageError(false)
              }}
              className="shrink-0"
              disabled={disabled}
              aria-label="Xóa hình ảnh"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Image preview */}
        {hasImage && !imageError && (
          <div className="aspect-video w-full flex items-center justify-center relative">
            <Image
              src={imageUrl}
              alt="Preview"
              fill
              className="object-contain"
              unoptimized
              onError={() => setImageError(true)}
              onLoad={() => setImageError(false)}
            />
          </div>
        )}

        {/* Error state */}
        {hasImage && imageError && (
          <div className="relative w-full rounded-lg border border-destructive/50 overflow-hidden bg-destructive/5">
            <div className="aspect-video w-full flex flex-col items-center justify-center gap-2 p-4 text-destructive">
              <ImageIcon className="h-8 w-8" />
              <span className="text-sm font-medium">Không thể tải hình ảnh</span>
              <span className="text-xs text-muted-foreground">Vui lòng kiểm tra lại URL</span>
            </div>
          </div>
        )}

        {/* Placeholder when no image */}
        {!hasImage && (
          <div className="relative w-full rounded-lg border border-dashed border-border overflow-hidden bg-muted/30">
            <div className="aspect-video w-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <ImageIcon className="h-12 w-12" />
              <span className="text-sm">Chưa có hình ảnh</span>
            </div>
          </div>
        )}

        {error && <FieldError id={errorId}>{error}</FieldError>}
      </div>
    </FieldContent>
  )
}

