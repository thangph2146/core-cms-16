/**
 * Public API Route: GET /api/(public)/post/posts
 * 
 * List published posts with pagination, filtering, and sorting
 * 
 * Query Parameters:
 * - page: number (default: 1)
 * - limit: number (default: 12, max: 100)
 * - search: string (optional)
 * - category: string | string[] (optional, category slug(s) - can specify multiple)
 * - tag: string | string[] (optional, tag slug(s) - can specify multiple)
 * - sort: "newest" | "oldest" (default: "newest")
 * 
 * @public - No authentication required
 */
import { NextRequest, NextResponse } from "next/server"
import { getPosts } from "@/features/public/post/server/queries"
import { POST_PAGINATION, POST_SEARCH } from "@/features/public/post/utils/constants"
import type { Post } from "@/features/public/post/types"
import type { ResourcePagination } from "@/features/admin/resources/server"

export interface PostsResponse {
  data: Post[]
  pagination: ResourcePagination
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams

    // Validate and parse pagination
    const pageParam = searchParams.get("page")
    const limitParam = searchParams.get("limit")
    
    const page = pageParam 
      ? Math.max(1, parseInt(pageParam, 10)) 
      : POST_PAGINATION.DEFAULT_PAGE
    const limit = limitParam 
      ? Math.min(POST_PAGINATION.MAX_LIMIT, Math.max(1, parseInt(limitParam, 10)))
      : POST_PAGINATION.DEFAULT_LIMIT

    if (isNaN(page) || isNaN(limit)) {
      return NextResponse.json(
        { error: "Invalid pagination parameters" },
        { status: 400 }
      )
    }

    // Parse filters
    const search = searchParams.get("search")?.trim() || undefined
    const categories = searchParams.getAll("category").filter(c => c.trim()).map(c => c.trim())
    const tags = searchParams.getAll("tag").filter(t => t.trim()).map(t => t.trim())
    const sortParam = searchParams.get("sort")
    const sort = (sortParam === "oldest" ? "oldest" : "newest") as "newest" | "oldest"

    // Validate search length
    if (search && search.length > POST_SEARCH.MAX_LENGTH) {
      return NextResponse.json(
        { error: `Search query too long (max ${POST_SEARCH.MAX_LENGTH} characters)` },
        { status: 400 }
      )
    }

    const result = await getPosts({
      page,
      limit,
      search,
      categories: categories.length > 0 ? categories : undefined,
      tags: tags.length > 0 ? tags : undefined,
      sort,
    })

    return NextResponse.json({
      data: result.data,
      pagination: result.pagination,
    } satisfies PostsResponse)
  } catch (error) {
    console.error("[GET /api/(public)/post/posts] Error:", error)
    
    // Determine error status
    const isValidationError = error instanceof Error && 
      (error.message.includes("Invalid") || error.message.includes("too long"))
    
    const status = isValidationError ? 400 : 500
    const errorMessage = error instanceof Error 
      ? error.message 
      : "Không thể tải danh sách bài viết"

    return NextResponse.json(
      { error: errorMessage },
      { status }
    )
  }
}

