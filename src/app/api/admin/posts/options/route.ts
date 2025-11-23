/**
 * API Route: GET /api/admin/posts/options - Get filter options for a column
 * 
 * Theo chuẩn Next.js 16: không cache admin data - luôn fetch fresh data
 */
import { NextRequest } from "next/server"
import { getPostColumnOptions } from "@/features/admin/posts/server/queries"
import { createGetRoute } from "@/lib/api/api-route-wrapper"
import type { ApiRouteContext } from "@/lib/api/types"
import { createOptionsHandler } from "@/lib/api/options-route-helper"

async function getPostOptionsHandler(req: NextRequest, _context: ApiRouteContext) {
  return createOptionsHandler(req, {
    allowedColumns: ["title", "slug"],
    getOptions: (column, search, limit) => getPostColumnOptions(column, search, limit),
  })
}

// Route Segment Config theo Next.js 16
// LƯU Ý: Phải là static values, không thể từ object (Next.js requirement)
export const dynamic = "force-dynamic"
export const revalidate = false

export const GET = createGetRoute(getPostOptionsHandler)

