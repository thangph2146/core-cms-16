/**
 * Non-cached Database Queries for Tags
 * 
 * Chứa các database queries không có cache wrapper
 * Sử dụng cho các trường hợp cần fresh data hoặc trong API routes
 */

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

