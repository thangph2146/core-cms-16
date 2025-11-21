/**
 * Cached Database Queries for Tags
 * 
 * Sử dụng unstable_cache (Data Cache) kết hợp với React cache (Request Memoization)
 * - unstable_cache: Cache kết quả giữa các requests (Persisted Cache)
 * - React cache: Deduplicate requests trong cùng một render pass
 * 
 * Pattern: Server Component → Cache Function → Database Query
 */

import { cache } from "react"
import { unstable_cache } from "next/cache"
import { listTags, getTagById, getTagColumnOptions } from "./queries"
import type { ListTagsInput, ListTagsResult, TagDetail } from "../types"

/**
 * Cache function: List tags
 * Caching strategy: Cache by params string
 */
export const listTagsCached = cache(async (params: ListTagsInput = {}): Promise<ListTagsResult> => {
  const cacheKey = JSON.stringify(params)
  return unstable_cache(
    async () => listTags(params),
    ['tags-list', cacheKey],
    { 
      tags: ['tags'], 
      revalidate: 3600 
    }
  )()
})

/**
 * Cache function: Get tag by ID
 * Caching strategy: Cache by ID
 */
export const getTagDetailById = cache(async (id: string): Promise<TagDetail | null> => {
  return unstable_cache(
    async () => getTagById(id),
    [`tag-${id}`],
    { 
      tags: ['tags', `tag-${id}`],
      revalidate: 3600 
    }
  )()
})

/**
 * Cache function: Get tag column options for filters
 * Caching strategy: Cache by column and search
 */
export const getTagColumnOptionsCached = cache(
  async (
    column: string,
    search?: string,
    limit: number = 50
  ): Promise<Array<{ label: string; value: string }>> => {
    const cacheKey = `${column}-${search || ''}-${limit}`
    return unstable_cache(
      async () => getTagColumnOptions(column, search, limit),
      [`tag-options-${cacheKey}`],
      { 
        tags: ['tags', 'tag-options'],
        revalidate: 3600 
      }
    )()
  }
)

/**
 * Cache function: Get active tags for select options
 * Caching strategy: Global active tags list
 */
export const getActiveTagsForSelectCached = cache(
  async (limit: number = 100): Promise<Array<{ label: string; value: string }>> => {
    return unstable_cache(
      async () => {
        const { prisma } = await import("@/lib/database/prisma")
        const tags = await prisma.tag.findMany({
          where: {
            deletedAt: null,
          },
          select: {
            id: true,
            name: true,
          },
          orderBy: {
            name: "asc",
          },
          take: limit,
        })

        return tags.map((tag) => ({
          label: tag.name,
          value: tag.id,
        }))
      },
      [`active-tags-select-${limit}`],
      { 
        tags: ['tags', 'active-tags'],
        revalidate: 3600 
      }
    )()
  }
)
