/**
 * Cache Functions for Posts
 * 
 * Sử dụng React cache() để:
 * - Tự động deduplicate requests trong cùng một render pass
 * - Cache kết quả để tái sử dụng
 * - Cải thiện performance với request deduplication
 * 
 * Pattern: Server Component → Cache Function → Database Query
 */

import { cache } from "react"
import { listPosts, getPostColumnOptions, type PostDetail, type ListPostsInput, type ListPostsResult } from "./queries"
import { mapPostRecord } from "./helpers"
import { prisma } from "@/lib/database"

/**
 * Cache function: List posts with pagination
 * 
 * Sử dụng cache() để tự động deduplicate requests và cache kết quả
 * Dùng cho Server Components
 * 
 * @param params - ListPostsInput
 * @returns ListPostsResult
 */
export const listPostsCached = cache(async (params: ListPostsInput = {}): Promise<ListPostsResult> => {
  return listPosts(params)
})

/**
 * Cache function: Get post detail by ID
 * 
 * Sử dụng cache() để tự động deduplicate requests và cache kết quả
 * 
 * @param id - Post ID
 * @returns Post detail hoặc null nếu không tìm thấy
 */
export const getPostDetailById = cache(async (id: string): Promise<PostDetail | null> => {
  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })

  if (!post) {
    return null
  }

  // Map post record to PostDetail format
  return {
    ...mapPostRecord(post),
    content: post.content,
  }
})

/**
 * Cache function: Get post column options for filters
 */
export const getPostColumnOptionsCached = cache(
  async (
    column: string,
    search?: string,
    limit: number = 50
  ): Promise<Array<{ label: string; value: string }>> => {
    return getPostColumnOptions(column, search, limit)
  }
)

