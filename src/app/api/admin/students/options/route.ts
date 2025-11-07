/**
 * API Route: GET /api/admin/students/options - Get filter options for a column
 * 
 * Theo chuẩn Next.js 16:
 * - Sử dụng server-side caching với React cache()
 * - Response caching với short-term cache (30s) để optimize performance
 * - Dynamic route vì có search query parameter
 */
import { NextRequest } from "next/server"
import { getStudentColumnOptionsCached } from "@/features/admin/students/server/cache"
import { createGetRoute } from "@/lib/api/api-route-wrapper"
import type { ApiRouteContext } from "@/lib/api/types"
import { createOptionsHandler } from "@/lib/api/options-route-helper"

async function getStudentOptionsHandler(req: NextRequest, _context: ApiRouteContext) {
  return createOptionsHandler(req, {
    allowedColumns: ["studentCode", "name", "email"],
    getOptions: (column, search, limit) => getStudentColumnOptionsCached(column, search, limit),
  })
}

// Route Segment Config theo Next.js 16
// LƯU Ý: Phải là static values, không thể từ object (Next.js requirement)
export const dynamic = "force-dynamic"
export const revalidate = false

export const GET = createGetRoute(getStudentOptionsHandler)

