/**
 * Helper Functions for Public Post Server Logic
 * 
 * Chứa các helper functions được dùng chung bởi queries và cache
 * Tách biệt logic để dễ maintain và test
 */

import type { Prisma } from "@prisma/client"
import type { Post, PostDetail } from "../types"

type PostWithRelations = Prisma.PostGetPayload<{
  include: {
    author: {
      select: {
        id: true
        name: true
        email: true
      }
    }
    categories: {
      select: {
        category: {
          select: {
            id: true
            name: true
            slug: true
          }
        }
      }
    }
    tags: {
      select: {
        tag: {
          select: {
            id: true
            name: true
            slug: true
          }
        }
      }
    }
  }
}>

/**
 * Map Prisma post record to Post format
 */
export function mapPostRecord(post: PostWithRelations): Post {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    image: post.image,
    publishedAt: post.publishedAt,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    author: {
      id: post.author.id,
      name: post.author.name,
      email: post.author.email,
    },
    categories: post.categories.map((pc) => pc.category),
    tags: post.tags.map((pt) => pt.tag),
  }
}

/**
 * Map Prisma post record to PostDetail format
 */
export function mapPostDetailRecord(post: PostWithRelations & { content: Prisma.JsonValue }): PostDetail {
  return {
    ...mapPostRecord(post),
    content: post.content,
  }
}

/**
 * Build Prisma where clause for public posts
 * Chỉ lấy posts đã published và không bị xóa
 */
export function buildPublicPostWhereClause(params: {
  search?: string
  categories?: string[]
  tags?: string[]
}): Prisma.PostWhereInput {
  const where: Prisma.PostWhereInput = {
    published: true,
    deletedAt: null,
    publishedAt: {
      lte: new Date(),
    },
  }

  // Search filter
  if (params.search && params.search.trim()) {
    const searchValue = params.search.trim()
    where.OR = [
      { title: { contains: searchValue, mode: "insensitive" } },
      { excerpt: { contains: searchValue, mode: "insensitive" } },
    ]
  }

  // Category filter - support multiple categories (OR logic: post must have ANY selected category)
  if (params.categories && params.categories.length > 0) {
    where.categories = {
      some: {
        category: {
          slug: {
            in: params.categories,
          },
        },
      },
    }
  }

  // Tag filter - support multiple tags (OR logic: post must have ANY selected tag)
  if (params.tags && params.tags.length > 0) {
    where.tags = {
      some: {
        tag: {
          slug: {
            in: params.tags,
          },
        },
      },
    }
  }

  return where
}

/**
 * Build Prisma orderBy clause for public posts
 */
export function buildPublicPostOrderBy(sort?: "newest" | "oldest"): Prisma.PostOrderByWithRelationInput {
  return sort === "oldest"
    ? { publishedAt: "asc" }
    : { publishedAt: "desc" }
}

export type { PostWithRelations }

