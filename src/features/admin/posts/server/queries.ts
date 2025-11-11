/**
 * Non-cached Database Queries for Posts
 * 
 * Chứa các database queries không có cache wrapper
 * Sử dụng cho các trường hợp cần fresh data hoặc trong API routes
 */

import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/database"
import { validatePagination, buildPagination, type ResourcePagination } from "@/features/admin/resources/server"
import { mapPostRecord, buildWhereClause } from "./helpers"

export interface ListPostsInput {
  page?: number
  limit?: number
  search?: string
  filters?: Record<string, string>
  status?: "active" | "deleted" | "all"
}

export interface ListedPost {
  id: string
  title: string
  slug: string
  excerpt: string | null
  image: string | null
  published: boolean
  publishedAt: Date | null
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
  author: {
    id: string
    name: string | null
    email: string
  }
}

export interface PostDetail extends ListedPost {
  content: Prisma.JsonValue
}

export interface ListPostsResult {
  data: ListedPost[]
  pagination: ResourcePagination
}

export async function listPosts(params: ListPostsInput = {}): Promise<ListPostsResult> {
  const { page, limit } = validatePagination(params.page, params.limit, 100)
  const where = buildWhereClause(params)

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
    prisma.post.count({ where }),
  ])

  return {
    data: posts.map(mapPostRecord),
    pagination: buildPagination(page, limit, total),
  }
}

/**
 * Get unique values for a specific column (for filter options)
 */
export async function getPostColumnOptions(
  column: string,
  search?: string,
  limit: number = 50
): Promise<Array<{ label: string; value: string }>> {
  const where: Prisma.PostWhereInput = {
    deletedAt: null, // Only active posts
  }

  // Add search filter if provided
  if (search && search.trim()) {
    const searchValue = search.trim()
    switch (column) {
      case "title":
        where.title = { contains: searchValue, mode: "insensitive" }
        break
      case "slug":
        where.slug = { contains: searchValue, mode: "insensitive" }
        break
      default:
        where.title = { contains: searchValue, mode: "insensitive" }
    }
  }

  // Build select based on column
  let selectField: Prisma.PostSelect
  switch (column) {
    case "title":
      selectField = { title: true }
      break
    case "slug":
      selectField = { slug: true }
      break
    default:
      selectField = { title: true }
  }

  const results = await prisma.post.findMany({
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

export async function getPostById(id: string): Promise<PostDetail | null> {
  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })

  if (!post) {
    return null
  }

  return {
    ...mapPostRecord(post),
    content: post.content,
  }
}

// Re-export helpers for convenience
export { mapPostRecord, type PostWithAuthor } from "./helpers"

