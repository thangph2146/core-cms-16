/**
 * API Route: GET /api/admin/contact-requests/options - Get filter options for a column
 * 
 * Theo chuẩn Next.js 16: không cache admin data - luôn fetch fresh data
 */
import { NextRequest } from "next/server"
import { getContactRequestColumnOptions } from "@/features/admin/contact-requests/server/queries"
import { createGetRoute } from "@/lib/api/api-route-wrapper"
import type { ApiRouteContext } from "@/lib/api/types"
import { createOptionsHandler } from "@/lib/api/options-route-helper"

async function getContactRequestOptionsHandler(req: NextRequest, _context: ApiRouteContext) {
  return createOptionsHandler(req, {
    allowedColumns: ["name", "email", "phone", "subject"],
    getOptions: (column, search, limit) => getContactRequestColumnOptions(column, search, limit),
  })
}

// Route Segment Config theo Next.js 16
// LƯU Ý: Phải export static values, không thể lấy từ object
export const dynamic = "force-dynamic"
export const revalidate = false

export const GET = createGetRoute(getContactRequestOptionsHandler)

