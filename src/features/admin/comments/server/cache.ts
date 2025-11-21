/**
 * Cached Database Queries for Comments
 * 
 * Sử dụng unstable_cache (Data Cache) kết hợp với React cache (Request Memoization)
 * - unstable_cache: Cache kết quả giữa các requests (Persisted Cache)
 * - React cache: Deduplicate requests trong cùng một render pass
 * 
 * Pattern: Server Component → Cache Function → Database Query
 */

import { cache } from "react"
import { unstable_cache } from "next/cache"
import { listComments, getCommentById, getCommentColumnOptions } from "./queries"
import type { ListCommentsInput, ListCommentsResult, CommentDetail } from "../types"

/**
 * Cache function: List comments
 * Caching strategy: Cache by params string
 */
export const listCommentsCached = cache(async (params: ListCommentsInput = {}): Promise<ListCommentsResult> => {
  const cacheKey = JSON.stringify(params)
  return unstable_cache(
    async () => listComments(params),
    ['comments-list', cacheKey],
    { 
      tags: ['comments'], 
      revalidate: 3600 
    }
  )()
})

/**
 * Cache function: Get comment by ID
 * Caching strategy: Cache by ID
 */
export const getCommentDetailById = cache(async (id: string): Promise<CommentDetail | null> => {
  return unstable_cache(
    async () => getCommentById(id),
    [`comment-${id}`],
    { 
      tags: ['comments', `comment-${id}`],
      revalidate: 3600 
    }
  )()
})

/**
 * Cache function: Get comment column options for filters
 * Caching strategy: Cache by column and search
 */
export const getCommentColumnOptionsCached = cache(
  async (
    column: string,
    search?: string,
    limit: number = 50
  ): Promise<Array<{ label: string; value: string }>> => {
    const cacheKey = `${column}-${search || ''}-${limit}`
    return unstable_cache(
      async () => getCommentColumnOptions(column, search, limit),
      [`comment-options-${cacheKey}`],
      { 
        tags: ['comments', 'comment-options'],
        revalidate: 3600 
      }
    )()
  }
)
