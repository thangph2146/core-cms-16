/**
 * API Route: GET /api/admin/notifications/options - Get filter options for a column
 * 
 * Theo chuẩn Next.js 16:
 * - Sử dụng server-side caching với React cache()
 * - Response caching với short-term cache (30s) để optimize performance
 * - Dynamic route vì có search query parameter
 */
import { NextRequest } from "next/server"
import { getNotificationColumnOptionsCached } from "@/features/admin/notifications/server/queries"
import { createGetRoute } from "@/lib/api/api-route-wrapper"
import type { ApiRouteContext } from "@/lib/api/types"
import { createOptionsHandler } from "@/lib/api/options-route-helper"

async function getNotificationOptionsHandler(req: NextRequest, _context: ApiRouteContext) {
  return createOptionsHandler(req, {
    allowedColumns: ["userEmail"],
    getOptions: (column, search, limit) => getNotificationColumnOptionsCached(column, search, limit),
  })
}

// Route Segment Config theo Next.js 16
// LƯU Ý: Phải export static values, không thể lấy từ object
// Theo: https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config
export const dynamic = "force-dynamic"
export const revalidate = false

export const GET = createGetRoute(getNotificationOptionsHandler)

