/**
 * Helper Functions for Categories Server Logic
 * 
 * Chứa các helper functions được dùng chung bởi queries, cache, và mutations
 * Sử dụng generic helpers từ resources/server khi có thể
 */

import type { Prisma } from "@prisma/client"
import type { DataTableResult } from "@/components/tables"
import { serializeDate } from "@/features/admin/resources/server"
import type { ListCategoriesInput, ListedCategory, CategoryDetail, ListCategoriesResult } from "../types"
import type { CategoryRow } from "../types"

type CategoryWithRelations = Prisma.CategoryGetPayload<Record<string, never>>

/**
 * Map Prisma category record to ListedCategory format
 */
export function mapCategoryRecord(category: CategoryWithRelations): ListedCategory {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    createdAt: category.createdAt,
    deletedAt: category.deletedAt,
  }
}

/**
 * Build Prisma where clause from ListCategoriesInput
 */
export function buildWhereClause(params: ListCategoriesInput): Prisma.CategoryWhereInput {
  const where: Prisma.CategoryWhereInput = {}
  const status = params.status ?? "active"

  if (status === "active") {
    where.deletedAt = null
  } else if (status === "deleted") {
    where.deletedAt = { not: null }
  }

  if (params.search) {
    const searchValue = params.search.trim()
    if (searchValue.length > 0) {
      where.OR = [
        { name: { contains: searchValue, mode: "insensitive" } },
        { slug: { contains: searchValue, mode: "insensitive" } },
        { description: { contains: searchValue, mode: "insensitive" } },
      ]
    }
  }

  if (params.filters) {
    const activeFilters = Object.entries(params.filters).filter(([, value]) => Boolean(value))
    for (const [key, rawValue] of activeFilters) {
      const value = typeof rawValue === "string" ? rawValue.trim() : ""
      if (!value) continue

      switch (key) {
        case "name":
          where.name = { contains: value, mode: "insensitive" }
          break
        case "slug":
          where.slug = { contains: value, mode: "insensitive" }
          break
        case "status":
          if (value === "deleted") where.deletedAt = { not: null }
          else if (value === "active") where.deletedAt = null
          break
        case "createdAt":
        case "deletedAt":
          try {
            const filterDate = new Date(value)
            if (!isNaN(filterDate.getTime())) {
              const startOfDay = new Date(filterDate)
              startOfDay.setHours(0, 0, 0, 0)
              const endOfDay = new Date(filterDate)
              endOfDay.setHours(23, 59, 59, 999)
              where[key === "createdAt" ? "createdAt" : "deletedAt"] = {
                gte: startOfDay,
                lte: endOfDay,
              }
            }
          } catch {
            // Invalid date format, skip filter
          }
          break
      }
    }
  }

  return where
}

/**
 * Serialize category data for DataTable format
 */
export function serializeCategoryForTable(category: ListedCategory): CategoryRow {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    createdAt: serializeDate(category.createdAt)!,
    deletedAt: serializeDate(category.deletedAt),
  }
}

/**
 * Serialize ListCategoriesResult to DataTable format
 */
export function serializeCategoriesList(data: ListCategoriesResult): DataTableResult<CategoryRow> {
  return {
    page: data.pagination.page,
    limit: data.pagination.limit,
    total: data.pagination.total,
    totalPages: data.pagination.totalPages,
    rows: data.data.map(serializeCategoryForTable),
  }
}

/**
 * Serialize CategoryDetail to client format
 */
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

