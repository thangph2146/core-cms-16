import { getActiveCategoriesForSelect } from "@/features/admin/categories/server/queries"
import { getProductById } from "../server/queries"
import { serializeProductDetail } from "../server/helpers"
import { ProductEditClient } from "./product-edit.client"
import type { ProductEditClientProps } from "./product-edit.client"
import { NotFoundMessage } from "@/features/admin/resources/components"

export interface ProductEditProps {
  productId: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
  variant?: "dialog" | "sheet" | "page"
  backUrl?: string
  backLabel?: string
}

export async function ProductEdit({
  productId,
  open = true,
  onOpenChange,
  onSuccess,
  variant = "dialog",
  backUrl,
  backLabel = "Quay lại",
}: ProductEditProps) {
  const [product, categories] = await Promise.all([
    getProductById(productId),
    getActiveCategoriesForSelect(),
  ])

  if (!product) {
    return <NotFoundMessage resourceName="sản phẩm" />
  }

  const serializedProduct = serializeProductDetail(product)
  
  // Ensure description is properly parsed for Lexical editor
  // serializeProductDetail already handles parsing, but we ensure it's an object
  let parsedDescription: unknown = serializedProduct.description
  if (typeof parsedDescription === "string" && parsedDescription.trim().startsWith("{")) {
    try {
      parsedDescription = JSON.parse(parsedDescription)
    } catch {
      // If parsing fails, keep as string (fallback)
      parsedDescription = parsedDescription
    }
  }

  const productForEdit: ProductEditClientProps["product"] = {
    ...serializedProduct,
    categoryIds: product.categories?.map((c) => c.id) || [],
    status: product.status as "DRAFT" | "ACTIVE" | "INACTIVE" | "ARCHIVED",
    description: parsedDescription as string | null | undefined,
  }

  return (
    <ProductEditClient
      product={productForEdit}
      open={open}
      onOpenChange={onOpenChange}
      onSuccess={onSuccess}
      variant={variant}
      backUrl={backUrl}
      backLabel={backLabel}
      productId={productId}
      categories={categories}
    />
  )
}

