/**
 * API Route: GET /api/admin/contact-requests/options - Get filter options for a column
 * 
 * Theo chuẩn Next.js 16:
 * - Sử dụng server-side caching với React cache()
 * - Response caching với short-term cache (30s) để optimize performance
 * - Dynamic route vì có search query parameter
 */
import { NextRequest } from "next/server"
import { getContactRequestColumnOptionsCached } from "@/features/admin/contact-requests/server/cache"
import { createGetRoute } from "@/lib/api/api-route-wrapper"
import type { ApiRouteContext } from "@/lib/api/types"
import { createOptionsHandler } from "@/lib/api/options-route-helper"

async function getContactRequestOptionsHandler(req: NextRequest, _context: ApiRouteContext) {
  return createOptionsHandler(req, {
    allowedColumns: ["name", "email", "phone", "subject"],
    getOptions: (column, search, limit) => getContactRequestColumnOptionsCached(column, search, limit),
  })
}

// Route Segment Config theo Next.js 16
// LƯU Ý: Phải export static values, không thể lấy từ object
export const dynamic = "force-dynamic"
export const revalidate = false

export const GET = createGetRoute(getContactRequestOptionsHandler)

