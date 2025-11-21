/**
 * Cached Database Queries for Sessions
 * 
 * Sử dụng unstable_cache (Data Cache) kết hợp với React cache (Request Memoization)
 * - unstable_cache: Cache kết quả giữa các requests (Persisted Cache)
 * - React cache: Deduplicate requests trong cùng một render pass
 * 
 * Pattern: Server Component → Cache Function → Database Query
 */

import { cache } from "react"
import { unstable_cache } from "next/cache"
import { listSessions, getSessionById, getSessionColumnOptions } from "./queries"
import type { ListSessionsInput, ListSessionsResult, SessionDetail } from "../types"

/**
 * Cache function: List sessions
 * Caching strategy: Cache by params string
 */
export const listSessionsCached = cache(async (params: ListSessionsInput = {}): Promise<ListSessionsResult> => {
  const cacheKey = JSON.stringify(params)
  return unstable_cache(
    async () => listSessions(params),
    ['sessions-list', cacheKey],
    { 
      tags: ['sessions'], 
      revalidate: 3600 
    }
  )()
})

/**
 * Cache function: Get session by ID
 * Caching strategy: Cache by ID
 */
export const getSessionDetailById = cache(async (id: string): Promise<SessionDetail | null> => {
  return unstable_cache(
    async () => getSessionById(id),
    [`session-${id}`],
    { 
      tags: ['sessions', `session-${id}`],
      revalidate: 3600 
    }
  )()
})

/**
 * Cache function: Get session column options for filters
 * Caching strategy: Cache by column and search
 */
export const getSessionColumnOptionsCached = cache(
  async (
    column: string,
    search?: string,
    limit: number = 50
  ): Promise<Array<{ label: string; value: string }>> => {
    const cacheKey = `${column}-${search || ''}-${limit}`
    return unstable_cache(
      async () => getSessionColumnOptions(column, search, limit),
      [`session-options-${cacheKey}`],
      { 
        tags: ['sessions', 'session-options'],
        revalidate: 3600 
      }
    )()
  }
)
