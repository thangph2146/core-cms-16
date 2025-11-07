/**
 * Non-cached Database Queries for Tags
 * 
 * Chứa các database queries không có cache wrapper
 * Sử dụng cho các trường hợp cần fresh data hoặc trong API routes
 */

import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/database"
import { validatePagination, buildPagination } from "@/features/admin/resources/server"
import { mapTagRecord, buildWhereClause } from "./helpers"
import type { ListTagsInput, TagDetail, ListTagsResult } from "../types"

export async function listTags(params: ListTagsInput = {}): Promise<ListTagsResult> {
  const { page, limit } = validatePagination(params.page, params.limit, 100)
  const where = buildWhereClause(params)

  const [data, total] = await Promise.all([
    prisma.tag.findMany({
      where,
      orderBy: { createdAt: "desc" },
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
  const where: Prisma.TagWhereInput = {
    deletedAt: null, // Only active tags
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
        where.name = { contains: searchValue, mode: "insensitive" }
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

export async function getTagById(id: string): Promise<TagDetail | null> {
  const tag = await prisma.tag.findUnique({
    where: { id },
  })

  if (!tag) {
    return null
  }

  return {
    ...mapTagRecord(tag),
    updatedAt: tag.updatedAt,
  }
}

