import type { ResourceResponse, BaseResourceTableClientProps, ResourcePagination, BulkActionResult } from "@/features/admin/resources/types"

export interface CategoryRow {
  id: string
  name: string
  slug: string
  description: string | null
  createdAt: string
  updatedAt?: string // Optional để hỗ trợ cache comparison
  deletedAt: string | null
}

export type CategoriesTableClientProps = BaseResourceTableClientProps<CategoryRow>

export type CategoriesResponse = ResourceResponse<CategoryRow>

export interface ListCategoriesInput {
  page?: number
  limit?: number
  search?: string
  filters?: Record<string, string>
  status?: "active" | "deleted" | "all"
}

export interface ListedCategory {
  id: string
  name: string
  slug: string
  description: string | null
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export type CategoryDetail = ListedCategory

export interface ListCategoriesResult {
  data: ListedCategory[]
  pagination: ResourcePagination
}

// Types are now exported from schemas.ts
export type { CreateCategoryInput, UpdateCategoryInput, BulkCategoryActionInput } from "./server/schemas"

export type { BulkActionResult }

