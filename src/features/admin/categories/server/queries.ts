/**
 * Non-cached Database Queries for Categories
 * 
 * Chứa các database queries không có cache wrapper
 * Sử dụng cho các trường hợp cần fresh data hoặc trong API routes
 */

import { prisma } from "@/lib/database"
import { validatePagination, buildPagination } from "@/features/admin/resources/server"
import { mapCategoryRecord, buildWhereClause } from "./helpers"
import type { ListCategoriesInput, ListedCategory, CategoryDetail, ListCategoriesResult } from "../types"

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

