/**
 * Helper Functions for Tags Server Logic
 * 
 * Chứa các helper functions được dùng chung bởi queries, cache, và mutations
 * Sử dụng generic helpers từ resources/server khi có thể
 */

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

  // Apply status filter
  applyStatusFilter(where, params.status)

  // Apply search filter
  applySearchFilter(where, params.search, ["name", "slug"])

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

/**
 * Serialize tag data for DataTable format
 * Handles both Date objects and date strings (from cache serialization)
 */
export function serializeTagForTable(tag: ListedTag | { id: string; name: string; slug: string; createdAt: Date | string; deletedAt: Date | string | null }): TagRow {
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

