/**
 * Helper Functions for Posts Server Logic
 * 
 * Chứa các helper functions được dùng chung bởi queries, cache, và mutations
 * Sử dụng generic helpers từ resources/server khi có thể
 */

import type { Prisma } from "@prisma/client"
import type { DataTableResult } from "@/components/tables"
import { serializeDate } from "@/features/admin/resources/server"
import type { ListPostsInput, ListedPost, PostDetail, ListPostsResult } from "./queries"
import type { PostRow } from "../types"

type PostWithAuthor = Prisma.PostGetPayload<{
  include: {
    author: {
      select: {
        id: true
        name: true
        email: true
      }
    }
  }
}>

/**
 * Map Prisma post record to ListedPost format
 */
export function mapPostRecord(post: PostWithAuthor): ListedPost {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    image: post.image,
    published: post.published,
    publishedAt: post.publishedAt,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    deletedAt: post.deletedAt,
    author: post.author,
  }
}

/**
 * Build Prisma where clause from ListPostsInput
 */
export function buildWhereClause(params: ListPostsInput): Prisma.PostWhereInput {
  const where: Prisma.PostWhereInput = {}
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
        { title: { contains: searchValue, mode: "insensitive" } },
        { slug: { contains: searchValue, mode: "insensitive" } },
        { excerpt: { contains: searchValue, mode: "insensitive" } },
      ]
    }
  }

  if (params.filters) {
    const activeFilters = Object.entries(params.filters).filter(([, value]) => Boolean(value))
    for (const [key, rawValue] of activeFilters) {
      const value = rawValue?.trim()
      if (!value) continue

      switch (key) {
        case "title":
          where.title = { contains: value, mode: "insensitive" }
          break
        case "slug":
          where.slug = { contains: value, mode: "insensitive" }
          break
        case "published":
          if (value === "true" || value === "1") where.published = true
          else if (value === "false" || value === "0") where.published = false
          break
        case "authorId":
          where.authorId = value
          break
        case "status":
          if (value === "deleted") where.deletedAt = { not: null }
          else if (value === "active") where.deletedAt = null
          break
        case "createdAt":
        case "publishedAt":
        case "deletedAt":
          try {
            const filterDate = new Date(value)
            if (!isNaN(filterDate.getTime())) {
              const startOfDay = new Date(filterDate)
              startOfDay.setHours(0, 0, 0, 0)
              const endOfDay = new Date(filterDate)
              endOfDay.setHours(23, 59, 59, 999)
              const dateField = key === "createdAt" ? "createdAt" : key === "publishedAt" ? "publishedAt" : "deletedAt"
              where[dateField] = {
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
 * Serialize post data for DataTable format
 */
export function serializePostForTable(post: ListedPost): PostRow {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    image: post.image,
    published: post.published,
    publishedAt: serializeDate(post.publishedAt),
    createdAt: serializeDate(post.createdAt)!,
    deletedAt: serializeDate(post.deletedAt),
    author: post.author,
  }
}

/**
 * Serialize ListPostsResult to DataTable format
 */
export function serializePostsList(data: ListPostsResult): DataTableResult<PostRow> {
  return {
    page: data.pagination.page,
    limit: data.pagination.limit,
    total: data.pagination.total,
    totalPages: data.pagination.totalPages,
    rows: data.data.map(serializePostForTable),
  }
}

/**
 * Serialize PostDetail to client format
 */
export function serializePostDetail(post: PostDetail) {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    content: post.content,
    excerpt: post.excerpt,
    image: post.image,
    published: post.published,
    publishedAt: serializeDate(post.publishedAt),
    createdAt: serializeDate(post.createdAt)!,
    updatedAt: serializeDate(post.updatedAt)!,
    deletedAt: serializeDate(post.deletedAt),
    author: post.author,
  }
}

export type { PostWithAuthor }

