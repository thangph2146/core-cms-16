/**
 * Non-cached Database Queries for Tags
 * 
 * Chứa các database queries không có cache wrapper
 * Sử dụng cho các trường hợp cần fresh data hoặc trong API routes
 */

import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/database"
import {
  validatePagination,
  buildPagination,
  applyColumnOptionsStatusFilter,
  applyColumnOptionsSearchFilter,
  mapToColumnOptions,
} from "@/features/admin/resources/server"
import { mapTagRecord, buildWhereClause } from "./helpers"
import type { ListTagsInput, TagDetail, ListTagsResult } from "../types"

export async function listTags(params: ListTagsInput = {}): Promise<ListTagsResult> {
  const { page, limit } = validatePagination(params.page, params.limit, 100)
  const where = buildWhereClause(params)

  const [data, total] = await Promise.all([
    prisma.tag.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.tag.count({ where }),
  ])

  return {
    data: data.map(mapTagRecord),
    pagination: buildPagination(page, limit, total),
  }
}

/**
 * Get unique values for a specific column (for filter options)
 */
export async function getTagColumnOptions(
  column: string,
  search?: string,
  limit: number = 50
): Promise<Array<{ label: string; value: string }>> {
  const where: Prisma.TagWhereInput = {}

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
        applyColumnOptionsSearchFilter(where, search, "name")
    }
  }

  // Build select based on column
  let selectField: Prisma.TagSelect
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

  const results = await prisma.tag.findMany({
    where,
    select: selectField,
    orderBy: { [column]: "asc" },
    take: limit,
  })

  // Map results to options format
  return mapToColumnOptions(results, column)
}

export async function getTagById(id: string): Promise<TagDetail | null> {
  const tag = await prisma.tag.findUnique({
    where: { id },
  })

  if (!tag) {
    return null
  }

  // mapTagRecord đã include updatedAt
  return mapTagRecord(tag)
}

/**
 * Get active tags for select options (non-cached)
 * Theo chuẩn Next.js 16: không cache admin data
 */
export async function getActiveTagsForSelect(limit: number = 100): Promise<Array<{ label: string; value: string }>> {
  const tags = await prisma.tag.findMany({
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

  return tags.map((tag) => ({
    label: tag.name,
    value: tag.id,
  }))
}

