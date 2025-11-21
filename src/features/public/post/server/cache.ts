/**
 * Cache Functions for Public Posts
 * 
 * Sử dụng unstable_cache (Data Cache) kết hợp với React cache (Request Memoization)
 * - unstable_cache: Cache kết quả giữa các requests (Persisted Cache)
 * - React cache: Deduplicate requests trong cùng một render pass
 * 
 * Pattern: Server Component → Cache Function → Database Query
 */

import { cache } from "react"
import { unstable_cache } from "next/cache"
import { getPosts, getPostBySlug, getCategories, getRelatedPosts, type GetPostsParams, type PostsResult } from "./queries"
import type { Post, PostDetail } from "../types"

/**
 * Cache function: Get posts with pagination
 * Caching strategy: Cache by params string
 */
export const getPostsCached = cache(async (params: GetPostsParams = {}): Promise<PostsResult> => {
  const cacheKey = JSON.stringify(params)
  return unstable_cache(
    async () => getPosts(params),
    ['posts-list', cacheKey],
    { 
      tags: ['posts'], 
      revalidate: 3600 // 1 hour default revalidation
    }
  )()
})

/**
 * Cache function: Get post detail by slug
 * Caching strategy: Cache by slug
 */
export const getPostBySlugCached = cache(async (slug: string): Promise<PostDetail | null> => {
  return unstable_cache(
    async () => getPostBySlug(slug),
    [`post-slug-${slug}`],
    { 
      tags: ['posts', `post-${slug}`],
      revalidate: 3600 
    }
  )()
})

/**
 * Cache function: Get categories with published posts
 * Caching strategy: Global categories list
 */
export const getCategoriesCached = cache(async () => {
  return unstable_cache(
    async () => getCategories(),
    ['posts-categories'],
    { 
      tags: ['categories', 'posts'],
      revalidate: 86400 // 24 hours
    }
  )()
})

/**
 * Cache function: Get related posts
 * Caching strategy: Cache by postId
 */
export const getRelatedPostsCached = cache(
  async (
    postId: string,
    categoryIds: string[],
    tagIds: string[],
    limit: number = 4
  ): Promise<Post[]> => {
    const cacheKey = `${postId}-${categoryIds.join(',')}-${tagIds.join(',')}-${limit}`
    return unstable_cache(
      async () => getRelatedPosts(postId, categoryIds, tagIds, limit),
      [`post-related-${cacheKey}`],
      { 
        tags: ['posts', `post-related-${postId}`],
        revalidate: 3600 
      }
    )()
  }
)
