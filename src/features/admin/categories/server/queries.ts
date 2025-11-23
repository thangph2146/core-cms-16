/**
 * Non-cached Database Queries for Categories
 * 
 * Chứa các database queries không có cache wrapper
 * Sử dụng cho các trường hợp cần fresh data hoặc trong API routes
 */

import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/database"
import { validatePagination, buildPagination, applyColumnOptionsStatusFilter, applyColumnOptionsSearchFilter, mapToColumnOptions } from "@/features/admin/resources/server"
import { mapCategoryRecord, buildWhereClause } from "./helpers"
import type { ListCategoriesInput, CategoryDetail, ListCategoriesResult } from "../types"

export async function listCategories(params: ListCategoriesInput = {}): Promise<ListCategoriesResult> {
  const { page, limit } = validatePagination(params.page, params.limit, 100)
  const where = buildWhereClause(params)

  const [data, total] = await Promise.all([
    prisma.category.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.category.count({ where }),
  ])

  return {
    data: data.map(mapCategoryRecord),
    pagination: buildPagination(page, limit, total),
  }
}

/**
 * Get unique values for a specific column (for filter options)
 */
export async function getCategoryColumnOptions(
  column: string,
  search?: string,
  limit: number = 50
): Promise<Array<{ label: string; value: string }>> {
  const where: Prisma.CategoryWhereInput = {}

  // Apply status filter (default: active - column options thường chỉ cần active items)
  applyColumnOptionsStatusFilter(where, "active")

  // Apply search filter based on column
  if (search && search.trim()) {
    switch (column) {
      case "name":
        applyColumnOptionsSearchFilter(where, search, "name")
        break
      case "slug":
        applyColumnOptionsSearchFilter(where, search, "slug")
        break
      default:
        // For other columns, search in name as fallback
        applyColumnOptionsSearchFilter(where, search, "name")
    }
  }

  // Build select based on column
  let selectField: Prisma.CategorySelect
  switch (column) {
    case "name":
      selectField = { name: true }
      break
    case "slug":
      selectField = { slug: true }
      break
    default:
      selectField = { name: true }
  }

  const results = await prisma.category.findMany({
    where,
    select: selectField,
    orderBy: { [column]: "asc" },
    take: limit,
  })

  // Map results to options format
  return mapToColumnOptions(results, column)
}

export async function getCategoryById(id: string): Promise<CategoryDetail | null> {
  const category = await prisma.category.findUnique({
    where: { id },
  })

  if (!category) {
    return null
  }

  // mapCategoryRecord đã include updatedAt
  return mapCategoryRecord(category)
}

/**
 * Get active categories for select options (non-cached)
 * Theo chuẩn Next.js 16: không cache admin data
 */
export async function getActiveCategoriesForSelect(limit: number = 100): Promise<Array<{ label: string; value: string }>> {
  const categories = await prisma.category.findMany({
    where: {
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: "asc",
    },
    take: limit,
  })

  return categories.map((category) => ({
    label: category.name,
    value: category.id,
  }))
}

