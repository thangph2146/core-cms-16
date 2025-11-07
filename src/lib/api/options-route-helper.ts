/**
 * Helper function để tạo options API route handler
 * Đảm bảo consistency và tối ưu hóa theo chuẩn Next.js 16
 * 
 * Theo Next.js 16 caching best practices:
 * - Sử dụng React cache() trong server queries để deduplicate requests
 * - Response caching với Cache-Control headers cho API routes
 * - Route Segment Config với dynamic = 'force-dynamic' cho search queries
 */
import { NextRequest, NextResponse } from "next/server"
import { sanitizeSearchQuery } from "./validation"
import { logger } from "@/lib/config"

export interface OptionsRouteConfig {
  allowedColumns: string[]
  getOptions: (column: string, search?: string, limit?: number) => Promise<Array<{ label: string; value: string }>>
}

/**
 * Tạo options API route handler với validation và caching
 * 
 * @param req - NextRequest
 * @param config - Configuration cho options route
 * @returns NextResponse với options data hoặc error
 */
export async function createOptionsHandler(
  req: NextRequest,
  config: OptionsRouteConfig
): Promise<NextResponse> {
  const searchParams = req.nextUrl.searchParams
  const column = searchParams.get("column")
  const search = searchParams.get("search") || ""
  const limitParam = searchParams.get("limit")

  // Validate column parameter
  if (!column) {
    return NextResponse.json(
      { error: "Column parameter is required" },
      { status: 400 }
    )
  }

  // Validate column (whitelist allowed columns)
  if (!config.allowedColumns.includes(column)) {
    return NextResponse.json(
      {
        error: `Column '${column}' is not allowed. Allowed columns: ${config.allowedColumns.join(", ")}`,
      },
      { status: 400 }
    )
  }

  // Validate and sanitize search query
  const searchValidation = sanitizeSearchQuery(search, 100)
  const searchValue = searchValidation.valid ? searchValidation.value : undefined

  // Validate limit
  const limit = limitParam ? parseInt(limitParam, 10) : 50
  if (isNaN(limit) || limit < 1 || limit > 100) {
    return NextResponse.json(
      { error: "Limit must be between 1 and 100" },
      { status: 400 }
    )
  }

  try {
    const options = await config.getOptions(column, searchValue, limit)
    
    // Create response with caching headers
    // Cache for 30 seconds để optimize performance nhưng vẫn đảm bảo data fresh
    // Theo Next.js 16: https://nextjs.org/docs/app/building-your-application/caching
    const response = NextResponse.json({ data: options })
    
    // Set cache headers theo Next.js 16 best practices
    // - private: Chỉ cache ở client, không cache ở shared CDN (vì có authentication)
    // - s-maxage=30: Cache ở edge/CDN trong 30 giây
    // - stale-while-revalidate=60: Serve stale content trong 60s khi đang revalidate
    // Sử dụng short-term cache vì data có thể thay đổi và có search query
    response.headers.set(
      "Cache-Control",
      "private, s-maxage=30, stale-while-revalidate=60"
    )
    
    return response
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error(
      `Error fetching filter options for column '${column}'`,
      error instanceof Error ? error : new Error(errorMessage)
    )
    
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi lấy danh sách tùy chọn" },
      { status: 500 }
    )
  }
}
