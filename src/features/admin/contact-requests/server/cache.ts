/**
 * Cached Database Queries for Contact Requests
 * 
 * Sử dụng unstable_cache (Data Cache) kết hợp với React cache (Request Memoization)
 * - unstable_cache: Cache kết quả giữa các requests (Persisted Cache)
 * - React cache: Deduplicate requests trong cùng một render pass
 * 
 * Pattern: Server Component → Cache Function → Database Query
 */

import { cache } from "react"
import { unstable_cache } from "next/cache"
import { listContactRequests, getContactRequestById, getContactRequestColumnOptions } from "./queries"
import type { ListContactRequestsInput, ListContactRequestsResult, ContactRequestDetail } from "../types"

/**
 * Cache function: List contact requests
 * Caching strategy: Cache by params string
 */
export const listContactRequestsCached = cache(async (params: ListContactRequestsInput = {}): Promise<ListContactRequestsResult> => {
  const cacheKey = JSON.stringify(params)
  return unstable_cache(
    async () => listContactRequests(params),
    ['contact-requests-list', cacheKey],
    { 
      tags: ['contact-requests'], 
      revalidate: 3600 
    }
  )()
})

/**
 * Cache function: Get contact request by ID
 * Caching strategy: Cache by ID
 */
export const getContactRequestDetailById = cache(async (id: string): Promise<ContactRequestDetail | null> => {
  return unstable_cache(
    async () => getContactRequestById(id),
    [`contact-request-${id}`],
    { 
      tags: ['contact-requests', `contact-request-${id}`],
      revalidate: 3600 
    }
  )()
})

/**
 * Cache function: Get contact request column options for filters
 * Caching strategy: Cache by column and search
 */
export const getContactRequestColumnOptionsCached = cache(
  async (
    column: string,
    search?: string,
    limit: number = 50
  ): Promise<Array<{ label: string; value: string }>> => {
    const cacheKey = `${column}-${search || ''}-${limit}`
    return unstable_cache(
      async () => getContactRequestColumnOptions(column, search, limit),
      [`contact-request-options-${cacheKey}`],
      { 
        tags: ['contact-requests', 'contact-request-options'],
        revalidate: 3600 
      }
    )()
  }
)
