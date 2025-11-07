/**
 * Cached Database Queries for Sessions
 * 
 * Sử dụng React.cache() để tự động deduplicate requests và cache kết quả
 * Dùng cho Server Components để tối ưu performance
 */

import { cache } from "react"
import { listSessions, getSessionById, getSessionColumnOptions } from "./queries"
import type { ListSessionsInput, ListSessionsResult, SessionDetail } from "../types"

/**
 * Cache function: List sessions
 * 
 * Sử dụng cache() để tự động deduplicate requests và cache kết quả
 * Dùng cho Server Components
 * 
 * @param params - ListSessionsInput
 * @returns ListSessionsResult
 */
export const listSessionsCached = cache(async (params: ListSessionsInput = {}): Promise<ListSessionsResult> => {
  return listSessions(params)
})

/**
 * Cache function: Get session by ID
 * 
 * Sử dụng cache() để tự động deduplicate requests và cache kết quả
 * Dùng cho Server Components
 * 
 * @param id - Session ID
 * @returns SessionDetail | null
 */
export const getSessionDetailById = cache(async (id: string): Promise<SessionDetail | null> => {
  return getSessionById(id)
})

/**
 * Cache function: Get session column options for filters
 */
export const getSessionColumnOptionsCached = cache(
  async (
    column: string,
    search?: string,
    limit: number = 50
  ): Promise<Array<{ label: string; value: string }>> => {
    return getSessionColumnOptions(column, search, limit)
  }
)

