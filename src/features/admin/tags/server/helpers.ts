/**
 * Helper Functions for Tags Server Logic
 * 
 * Chứa các helper functions được dùng chung bởi queries, cache, và mutations
 * Sử dụng generic helpers từ resources/server khi có thể
 */

import type { Prisma } from "@prisma/client"
import type { DataTableResult } from "@/components/tables"
import { serializeDate } from "@/features/admin/resources/server"
import type { ListTagsInput, ListedTag, TagDetail, ListTagsResult } from "../types"
import type { TagRow } from "../types"

type TagWithRelations = Prisma.TagGetPayload<Record<string, never>>

/**
 * Map Prisma tag record to ListedTag format
 */
export function mapTagRecord(tag: TagWithRelations): ListedTag {
  return {
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    createdAt: tag.createdAt,
    deletedAt: tag.deletedAt,
  }
}

/**
 * Build Prisma where clause from ListTagsInput
 */
export function buildWhereClause(params: ListTagsInput): Prisma.TagWhereInput {
  const where: Prisma.TagWhereInput = {}
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
 * Serialize tag data for DataTable format
 */
export function serializeTagForTable(tag: ListedTag): TagRow {
  return {
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    createdAt: serializeDate(tag.createdAt)!,
    deletedAt: serializeDate(tag.deletedAt),
  }
}

/**
 * Serialize ListTagsResult to DataTable format
 */
export function serializeTagsList(data: ListTagsResult): DataTableResult<TagRow> {
  return {
    page: data.pagination.page,
    limit: data.pagination.limit,
    total: data.pagination.total,
    totalPages: data.pagination.totalPages,
    rows: data.data.map(serializeTagForTable),
  }
}

/**
 * Serialize TagDetail to client format
 */
export function serializeTagDetail(tag: TagDetail) {
  return {
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    createdAt: serializeDate(tag.createdAt)!,
    updatedAt: serializeDate(tag.updatedAt)!,
    deletedAt: serializeDate(tag.deletedAt),
  }
}

export type { TagWithRelations }

