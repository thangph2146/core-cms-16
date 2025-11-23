/**
 * Server Component: Category Detail
 * 
 * Fetches category data và pass xuống client component
 * Pattern: Server Component (data fetching) → Client Component (UI/interactions)
 */

import { getCategoryById } from "../server/queries"
import { serializeCategoryDetail } from "../server/helpers"
import { CategoryDetailClient } from "./category-detail.client"
import type { CategoryDetailData } from "./category-detail.client"
import { NotFoundMessage } from "@/features/admin/resources/components"

export interface CategoryDetailProps {
  categoryId: string
  backUrl?: string
}

export async function CategoryDetail({ categoryId, backUrl = "/admin/categories" }: CategoryDetailProps) {
  const category = await getCategoryById(categoryId)

  if (!category) {
    return <NotFoundMessage resourceName="danh mục" />
  }

  return (
    <CategoryDetailClient
      categoryId={categoryId}
      category={serializeCategoryDetail(category) as CategoryDetailData}
      backUrl={backUrl}
    />
  )
}

