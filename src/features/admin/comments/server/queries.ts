/**
 * Non-cached Database Queries for Comments
 * 
 * Chứa các database queries không có cache wrapper
 * Sử dụng cho các trường hợp cần fresh data hoặc trong API routes
 */

import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/database"
import { validatePagination, buildPagination } from "@/features/admin/resources/server"
import { mapCommentRecord, buildWhereClause } from "./helpers"
import type { ListCommentsInput, CommentDetail, ListCommentsResult } from "../types"

export async function listComments(params: ListCommentsInput = {}): Promise<ListCommentsResult> {
  const { page, limit } = validatePagination(params.page, params.limit, 100)
  const where = buildWhereClause(params)

  const [data, total] = await Promise.all([
    prisma.comment.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        post: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.comment.count({ where }),
  ])

  return {
    data: data.map(mapCommentRecord),
    pagination: buildPagination(page, limit, total),
  }
}

/**
 * Get unique values for a specific column (for filter options)
 */
export async function getCommentColumnOptions(
  column: string,
  search?: string,
  limit: number = 50
): Promise<Array<{ label: string; value: string }>> {
  const where: Prisma.CommentWhereInput = {
    deletedAt: null, // Only active comments
  }

  // Add search filter if provided
  if (search && search.trim()) {
    const searchValue = search.trim()
    switch (column) {
      case "content":
        where.content = { contains: searchValue, mode: "insensitive" }
        break
      case "authorName":
        where.author = { name: { contains: searchValue, mode: "insensitive" } }
        break
      case "authorEmail":
        where.author = { email: { contains: searchValue, mode: "insensitive" } }
        break
      case "postTitle":
        where.post = { title: { contains: searchValue, mode: "insensitive" } }
        break
      default:
        // For other columns, search in content as fallback
        where.content = { contains: searchValue, mode: "insensitive" }
    }
  }

  // Build select based on column
  const results = await prisma.comment.findMany({
    where,
    include: {
      author: {
        select: {
          name: true,
          email: true,
        },
      },
      post: {
        select: {
          title: true,
        },
      },
    },
    take: limit,
  })

  // Map results to options format with manual deduplication
  const optionsMap = new Map<string, string>()
  
  for (const item of results) {
    let value: string | null = null
    let label: string | null = null

    switch (column) {
      case "content":
        value = item.content
        label = item.content.length > 50 ? item.content.substring(0, 50) + "..." : item.content
        break
      case "authorName":
        value = item.author.name || item.author.email
        label = item.author.name || item.author.email
        break
      case "authorEmail":
        value = item.author.email
        label = item.author.email
        break
      case "postTitle":
        value = item.post.title
        label = item.post.title
        break
      default:
        continue
    }

    if (value && !optionsMap.has(value)) {
      optionsMap.set(value, label || value)
    }
  }

  return Array.from(optionsMap.entries()).map(([value, label]) => ({
    label,
    value,
  }))
}

export async function getCommentById(id: string): Promise<CommentDetail | null> {
  const comment = await prisma.comment.findUnique({
    where: { id },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      post: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  })

  if (!comment) {
    return null
  }

  return {
    ...mapCommentRecord(comment),
    updatedAt: comment.updatedAt.toISOString(),
  }
}

