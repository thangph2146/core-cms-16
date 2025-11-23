/**
 * Server Component: Category Edit
 * 
 * Fetches category data, sau đó pass xuống client component
 * Pattern: Server Component (data fetching) → Client Component (UI/interactions)
 */

import { getCategoryById } from "../server/queries"
import { serializeCategoryDetail } from "../server/helpers"
import { CategoryEditClient } from "./category-edit.client"
import type { CategoryEditClientProps } from "./category-edit.client"
import { NotFoundMessage } from "@/features/admin/resources/components"

export interface CategoryEditProps {
  categoryId: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
  variant?: "dialog" | "sheet" | "page"
  backUrl?: string
  backLabel?: string
}

export async function CategoryEdit({
  categoryId,
  open = true,
  onOpenChange,
  onSuccess,
  variant = "dialog",
  backUrl,
  backLabel = "Quay lại",
}: CategoryEditProps) {
  const category = await getCategoryById(categoryId)

  if (!category) {
    return <NotFoundMessage resourceName="danh mục" />
  }

  const categoryForEdit: CategoryEditClientProps["category"] = {
    ...serializeCategoryDetail(category),
  }

  return (
    <CategoryEditClient
      category={categoryForEdit}
      open={open}
      onOpenChange={onOpenChange}
      onSuccess={onSuccess}
      variant={variant}
      backUrl={backUrl}
      backLabel={backLabel}
      categoryId={categoryId}
    />
  )
}

