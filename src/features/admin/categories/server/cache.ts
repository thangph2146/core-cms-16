/**
 * Cached Database Queries for Categories
 * 
 * Sử dụng unstable_cache (Data Cache) kết hợp với React cache (Request Memoization)
 * - unstable_cache: Cache kết quả giữa các requests (Persisted Cache)
 * - React cache: Deduplicate requests trong cùng một render pass
 * 
 * Pattern: Server Component → Cache Function → Database Query
 */

import { cache } from "react"
import { unstable_cache } from "next/cache"
import { listCategories, getCategoryById, getCategoryColumnOptions } from "./queries"
import type { ListCategoriesInput, ListCategoriesResult, CategoryDetail } from "../types"

/**
 * Cache function: List categories
 * Caching strategy: Cache by params string
 */
export const listCategoriesCached = cache(async (params: ListCategoriesInput = {}): Promise<ListCategoriesResult> => {
  const cacheKey = JSON.stringify(params)
  return unstable_cache(
    async () => listCategories(params),
    ['categories-list', cacheKey],
    { 
      tags: ['categories'], 
      revalidate: 3600 
    }
  )()
})

/**
 * Cache function: Get category by ID
 * Caching strategy: Cache by ID
 */
export const getCategoryDetailById = cache(async (id: string): Promise<CategoryDetail | null> => {
  return unstable_cache(
    async () => getCategoryById(id),
    [`category-${id}`],
    { 
      tags: ['categories', `category-${id}`],
      revalidate: 3600 
    }
  )()
})

/**
 * Cache function: Get category column options for filters
 * Caching strategy: Cache by column and search
 */
export const getCategoryColumnOptionsCached = cache(
  async (
    column: string,
    search?: string,
    limit: number = 50
  ): Promise<Array<{ label: string; value: string }>> => {
    const cacheKey = `${column}-${search || ''}-${limit}`
    return unstable_cache(
      async () => getCategoryColumnOptions(column, search, limit),
      [`category-options-${cacheKey}`],
      { 
        tags: ['categories', 'category-options'],
        revalidate: 3600 
      }
    )()
  }
)

/**
 * Cache function: Get active categories for select options
 * Caching strategy: Global active categories list
 */
export const getActiveCategoriesForSelectCached = cache(
  async (limit: number = 100): Promise<Array<{ label: string; value: string }>> => {
    return unstable_cache(
      async () => {
        const { prisma } = await import("@/lib/database/prisma")
        const categories = await prisma.category.findMany({
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

        return categories.map((category) => ({
          label: category.name,
          value: category.id,
        }))
      },
      [`active-categories-select-${limit}`],
      { 
        tags: ['categories', 'active-categories'],
        revalidate: 3600 
      }
    )()
  }
)
