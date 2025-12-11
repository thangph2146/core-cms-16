"use client"

import { memo } from "react"
import { Button } from "@/components/ui/button"
import type { ProductVariant } from "../types"

interface ProductVariantsSectionProps {
  variantsByType: Record<string, ProductVariant[]>
  selectedVariants: Record<string, string>
  onVariantSelect: (type: string, variantId: string) => void
}

const VariantButton = memo<{
  variant: ProductVariant
  isSelected: boolean
  onSelect: () => void
}>(({ variant, isSelected, onSelect }) => {
  const isColor = variant.type === "color" && variant.value
  const priceText = variant.price
    ? ` (+${new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(parseFloat(variant.price))})`
    : ""

  return (
    <Button
      variant={isSelected ? "default" : "outline"}
      size="sm"
      onClick={onSelect}
      className={isColor ? "relative" : ""}
    >
      {isColor && (
        <span
          className="absolute left-1 top-1 h-4 w-4 rounded-full border border-background"
          style={{ backgroundColor: variant.value! }}
        />
      )}
      <span className={isColor ? "ml-6" : ""}>
        {variant.name}
        {priceText}
      </span>
    </Button>
  )
})
VariantButton.displayName = "VariantButton"

export const ProductVariantsSection = memo<ProductVariantsSectionProps>(
  ({ variantsByType, selectedVariants, onVariantSelect }) => {
    if (Object.keys(variantsByType).length === 0) return null

    const getTypeLabel = (type: string) => {
      const labels: Record<string, string> = {
        version: "Phiên bản",
        color: "Màu sắc",
      }
      return labels[type] || type
    }

    return (
      <div className="space-y-4">
        {Object.entries(variantsByType).map(([type, variants]) => (
          <div key={type}>
            <label className="text-sm font-medium mb-2 block capitalize">
              {getTypeLabel(type)}
            </label>
            <div className="flex flex-wrap gap-2">
              {variants.map((variant) => (
                <VariantButton
                  key={variant.id}
                  variant={variant}
                  isSelected={selectedVariants[type] === variant.id}
                  onSelect={() => onVariantSelect(type, variant.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }
)
ProductVariantsSection.displayName = "ProductVariantsSection"


