/**
 * Helper Functions for Comments Server Logic
 * 
 * Chứa các helper functions được dùng chung bởi queries, cache, và mutations
 */

import type { Prisma } from "@prisma/client"
import type { DataTableResult } from "@/components/tables"
import type { ListCommentsInput, ListedComment, CommentDetail, ListCommentsResult } from "../types"
import type { CommentRow } from "../types"

type CommentWithRelations = Prisma.CommentGetPayload<{
  include: {
    author: {
      select: {
        id: true
        name: true
        email: true
      }
    }
    post: {
      select: {
        id: true
        title: true
      }
    }
  }
}>

/**
 * Map Prisma comment record to ListedComment format
 */
export function mapCommentRecord(comment: CommentWithRelations): ListedComment {
  return {
    id: comment.id,
    content: comment.content,
    approved: comment.approved,
    authorId: comment.authorId,
    authorName: comment.author.name,
    authorEmail: comment.author.email,
    postId: comment.postId,
    postTitle: comment.post.title,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
    deletedAt: comment.deletedAt?.toISOString() || null,
  }
}

/**
 * Build Prisma where clause from ListCommentsInput
 */
export function buildWhereClause(params: ListCommentsInput): Prisma.CommentWhereInput {
  const where: Prisma.CommentWhereInput = {}
  const filters = params.filters || {}

  // Handle deleted filter
  if (filters.deleted === true) {
    where.deletedAt = { not: null }
  } else if (filters.deleted === false) {
    where.deletedAt = null
  }

  // Search filter with relations
  if (params.search) {
    const searchValue = params.search.trim()
    if (searchValue.length > 0) {
      where.OR = [
        { content: { contains: searchValue, mode: "insensitive" } },
        { author: { name: { contains: searchValue, mode: "insensitive" } } },
        { author: { email: { contains: searchValue, mode: "insensitive" } } },
        { post: { title: { contains: searchValue, mode: "insensitive" } } },
      ]
    }
  }

  // Approved filter
  if (filters.approved !== undefined) {
    where.approved = filters.approved
  }

  // Author filter
  if (filters.authorId) {
    where.authorId = filters.authorId
  }

  // Post filter
  if (filters.postId) {
    where.postId = filters.postId
  }

  return where
}

/**
 * Serialize comment data for DataTable format
 */
export function serializeCommentForTable(comment: ListedComment): CommentRow {
  return {
    id: comment.id,
    content: comment.content,
    approved: comment.approved,
    authorName: comment.authorName,
    authorEmail: comment.authorEmail,
    postTitle: comment.postTitle,
    postId: comment.postId,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    deletedAt: comment.deletedAt,
  }
}

/**
 * Serialize ListCommentsResult to DataTable format
 */
export function serializeCommentsList(data: ListCommentsResult): DataTableResult<CommentRow> {
  return {
    page: data.pagination.page,
    limit: data.pagination.limit,
    total: data.pagination.total,
    totalPages: data.pagination.totalPages,
    rows: data.data.map(serializeCommentForTable),
  }
}

/**
 * Serialize CommentDetail to client format
 */
export function serializeCommentDetail(comment: CommentDetail) {
  return {
    id: comment.id,
    content: comment.content,
    approved: comment.approved,
    authorId: comment.authorId,
    authorName: comment.authorName,
    authorEmail: comment.authorEmail,
    postId: comment.postId,
    postTitle: comment.postTitle,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    deletedAt: comment.deletedAt,
  }
}

export type { CommentWithRelations }

