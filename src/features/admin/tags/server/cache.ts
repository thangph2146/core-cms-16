/**
 * Cached Database Queries for Tags
 * 
 * Sử dụng React.cache() để tự động deduplicate requests và cache kết quả
 * Dùng cho Server Components để tối ưu performance
 */

import { cache } from "react"
import { listTags, getTagById, getTagColumnOptions } from "./queries"
import type { ListTagsInput, ListTagsResult, TagDetail } from "../types"

/**
 * Cache function: List tags
 * 
 * Sử dụng cache() để tự động deduplicate requests và cache kết quả
 * Dùng cho Server Components
 * 
 * @param params - ListTagsInput
 * @returns ListTagsResult
 */
export const listTagsCached = cache(async (params: ListTagsInput = {}): Promise<ListTagsResult> => {
  return listTags(params)
})

/**
 * Cache function: Get tag by ID
 * 
 * Sử dụng cache() để tự động deduplicate requests và cache kết quả
 * Dùng cho Server Components
 * 
 * @param id - Tag ID
 * @returns TagDetail | null
 */
export const getTagDetailById = cache(async (id: string): Promise<TagDetail | null> => {
  return getTagById(id)
})

/**
 * Cache function: Get tag column options for filters
 */
export const getTagColumnOptionsCached = cache(
  async (
    column: string,
    search?: string,
    limit: number = 50
  ): Promise<Array<{ label: string; value: string }>> => {
    return getTagColumnOptions(column, search, limit)
  }
)

