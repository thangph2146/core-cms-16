/**
 * Cached Database Queries for Students
 * 
 * Sử dụng unstable_cache (Data Cache) kết hợp với React cache (Request Memoization)
 * - unstable_cache: Cache kết quả giữa các requests (Persisted Cache)
 * - React cache: Deduplicate requests trong cùng một render pass
 * 
 * Pattern: Server Component → Cache Function → Database Query
 */

import { cache } from "react"
import { unstable_cache } from "next/cache"
import { listStudents, getStudentById, getStudentColumnOptions } from "./queries"
import type { ListStudentsInput, ListStudentsResult, StudentDetail } from "../types"

/**
 * Cache function: List students
 * Caching strategy: Cache by params string
 */
export const listStudentsCached = cache(async (params: ListStudentsInput = {}): Promise<ListStudentsResult> => {
  const cacheKey = JSON.stringify(params)
  return unstable_cache(
    async () => listStudents(params),
    ['students-list', cacheKey],
    { 
      tags: ['students'], 
      revalidate: 3600 
    }
  )()
})

/**
 * Cache function: Get student by ID
 * Caching strategy: Cache by ID
 */
export const getStudentDetailById = cache(
  async (id: string, actorId?: string, isSuperAdmin?: boolean): Promise<StudentDetail | null> => {
    const cacheKey = `student-${id}-${actorId || ''}-${isSuperAdmin ? 'admin' : 'user'}`
    return unstable_cache(
      async () => getStudentById(id, actorId, isSuperAdmin),
      [cacheKey],
      { 
        tags: ['students', `student-${id}`],
        revalidate: 3600 
      }
    )()
  }
)

/**
 * Cache function: Get student column options for filters
 * Caching strategy: Cache by column and search
 */
export const getStudentColumnOptionsCached = cache(
  async (
    column: string,
    search?: string,
    limit: number = 50,
    actorId?: string,
    isSuperAdmin?: boolean
  ): Promise<Array<{ label: string; value: string }>> => {
    const cacheKey = `${column}-${search || ''}-${limit}-${actorId || ''}-${isSuperAdmin ? 'admin' : 'user'}`
    return unstable_cache(
      async () => getStudentColumnOptions(column, search, limit, actorId, isSuperAdmin),
      [`student-options-${cacheKey}`],
      { 
        tags: ['students', 'student-options'],
        revalidate: 3600 
      }
    )()
  }
)
