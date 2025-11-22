/**
 * Helper Functions for Posts Server Logic
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
  applyBooleanFilter,
  applyStatusFilterFromFilters,
} from "@/features/admin/resources/server"
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
    categories: {
      include: {
        category: {
          select: {
            id: true
            name: true
          }
        }
      }
    }
    tags: {
      include: {
        tag: {
          select: {
            id: true
            name: true
          }
        }
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
    categories: post.categories?.map((pc) => ({
      id: pc.category.id,
      name: pc.category.name,
    })) || [],
    tags: post.tags?.map((pt) => ({
      id: pt.tag.id,
      name: pt.tag.name,
    })) || [],
  }
}

/**
 * Build Prisma where clause from ListPostsInput
 */
export function buildWhereClause(params: ListPostsInput): Prisma.PostWhereInput {
  const where: Prisma.PostWhereInput = {}

  // Apply status filter
  applyStatusFilter(where, params.status)

  // Apply search filter
  applySearchFilter(where, params.search, ["title", "slug", "excerpt"])

  // Apply custom filters
  if (params.filters) {
    const activeFilters = Object.entries(params.filters).filter(([, value]) => Boolean(value))
    for (const [key, rawValue] of activeFilters) {
      const value = rawValue?.trim()
      if (!value) continue

      switch (key) {
        case "title":
        case "slug":
          applyStringFilter(where, key, value)
          break
        case "published":
          applyBooleanFilter(where, key, value)
          break
        case "authorId":
          where.authorId = value
          break
        case "status":
          applyStatusFilterFromFilters(where, value)
          break
        case "createdAt":
        case "publishedAt":
        case "deletedAt":
          applyDateFilter(where, key, value)
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
    updatedAt: serializeDate(post.updatedAt) ?? undefined, // Thêm updatedAt để so sánh cache chính xác (convert null to undefined)
    deletedAt: serializeDate(post.deletedAt),
    author: post.author,
    categories: post.categories,
    tags: post.tags,
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
    categories: post.categories,
    tags: post.tags,
  }
}

export type { PostWithAuthor }

