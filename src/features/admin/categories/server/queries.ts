/**
 * Non-cached Database Queries for Categories
 * 
 * Chứa các database queries không có cache wrapper
 * Sử dụng cho các trường hợp cần fresh data hoặc trong API routes
 */

import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/database"
import { validatePagination, buildPagination } from "@/features/admin/resources/server"
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
  const where: Prisma.CategoryWhereInput = {
    deletedAt: null, // Only active categories
  }

  // Add search filter if provided
  if (search && search.trim()) {
    const searchValue = search.trim()
    switch (column) {
      case "name":
        where.name = { contains: searchValue, mode: "insensitive" }
        break
      case "slug":
        where.slug = { contains: searchValue, mode: "insensitive" }
        break
      default:
        // For other columns, search in name as fallback
        where.name = { contains: searchValue, mode: "insensitive" }
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
  return results
    .map((item) => {
      const value = item[column as keyof typeof item]
      if (typeof value === "string" && value.trim()) {
        return {
          label: value,
          value: value,
        }
      }
      return null
    })
    .filter((item): item is { label: string; value: string } => item !== null)
}

export async function getCategoryById(id: string): Promise<CategoryDetail | null> {
  const category = await prisma.category.findUnique({
    where: { id },
  })

  if (!category) {
    return null
  }

  return {
    ...mapCategoryRecord(category),
    updatedAt: category.updatedAt,
  }
}

