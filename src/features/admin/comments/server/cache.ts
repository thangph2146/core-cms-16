/**
 * Cached Database Queries for Comments
 * 
 * Sử dụng React.cache() để tự động deduplicate requests và cache kết quả
 * Dùng cho Server Components để tối ưu performance
 */

import { cache } from "react"
import { listComments, getCommentById, getCommentColumnOptions } from "./queries"
import type { ListCommentsInput, ListCommentsResult, CommentDetail } from "../types"

/**
 * Cache function: List comments
 * 
 * Sử dụng cache() để tự động deduplicate requests và cache kết quả
 * Dùng cho Server Components
 * 
 * @param params - ListCommentsInput
 * @returns ListCommentsResult
 */
export const listCommentsCached = cache(async (params: ListCommentsInput = {}): Promise<ListCommentsResult> => {
  return listComments(params)
})

/**
 * Cache function: Get comment by ID
 * 
 * Sử dụng cache() để tự động deduplicate requests và cache kết quả
 * Dùng cho Server Components
 * 
 * @param id - Comment ID
 * @returns CommentDetail | null
 */
export const getCommentDetailById = cache(async (id: string): Promise<CommentDetail | null> => {
  return getCommentById(id)
})

/**
 * Cache function: Get comment column options for filters
 * 
 * Sử dụng cache() để tự động deduplicate requests và cache kết quả
 * Dùng cho Server Components
 * 
 * @param column - Column name
 * @param search - Optional search query
 * @param limit - Maximum number of options
 * @returns Array of { label, value } options
 */
export const getCommentColumnOptionsCached = cache(
  async (
    column: string,
    search?: string,
    limit: number = 50
  ): Promise<Array<{ label: string; value: string }>> => {
    return getCommentColumnOptions(column, search, limit)
  }
)

