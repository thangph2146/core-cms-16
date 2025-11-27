import type { Prisma } from "@prisma/client"
import type { DataTableResult } from "@/components/tables"
import {
  serializeDate,
  applyStatusFilter,
  applySearchFilter,
  applyDateFilter,
  applyStringFilter,
  applyStatusFilterFromFilters,
} from "@/features/admin/resources/server"
import type { ListCategoriesInput, ListedCategory, CategoryDetail, ListCategoriesResult } from "../types"
import type { CategoryRow } from "../types"

type CategoryWithRelations = Prisma.CategoryGetPayload<Record<string, never>>

export function mapCategoryRecord(category: CategoryWithRelations): ListedCategory {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
    deletedAt: category.deletedAt,
  }
}

export function buildWhereClause(params: ListCategoriesInput): Prisma.CategoryWhereInput {
  const where: Prisma.CategoryWhereInput = {}

  // Apply status filter
  applyStatusFilter(where, params.status)

  // Apply search filter
  applySearchFilter(where, params.search, ["name", "slug", "description"])

  // Apply custom filters
  if (params.filters) {
    const activeFilters = Object.entries(params.filters).filter(([, value]) => Boolean(value))
    for (const [key, rawValue] of activeFilters) {
      const value = typeof rawValue === "string" ? rawValue.trim() : ""
      if (!value) continue

      switch (key) {
        case "name":
        case "slug":
          applyStringFilter(where, key, value)
          break
        case "status":
          applyStatusFilterFromFilters(where, value)
          break
        case "createdAt":
        case "deletedAt":
          applyDateFilter(where, key, value)
          break
      }
    }
  }

  return where
}

export function serializeCategoryForTable(category: ListedCategory): CategoryRow {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    createdAt: serializeDate(category.createdAt)!,
    updatedAt: serializeDate(category.updatedAt) ?? undefined, // Thêm updatedAt để so sánh cache chính xác (convert null to undefined)
    deletedAt: serializeDate(category.deletedAt),
  }
}

export function serializeCategoriesList(data: ListCategoriesResult): DataTableResult<CategoryRow> {
  return {
    page: data.pagination.page,
    limit: data.pagination.limit,
    total: data.pagination.total,
    totalPages: data.pagination.totalPages,
    rows: data.data.map(serializeCategoryForTable),
  }
}

export function serializeCategoryDetail(category: CategoryDetail) {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    createdAt: serializeDate(category.createdAt)!,
    updatedAt: serializeDate(category.updatedAt)!,
    deletedAt: serializeDate(category.deletedAt),
  }
}

export type { CategoryWithRelations }

