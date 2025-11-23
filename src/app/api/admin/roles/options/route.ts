/**
 * API Route: GET /api/admin/roles/options - Get filter options for a column
 * 
 * Theo chuẩn Next.js 16: không cache admin data - luôn fetch fresh data
 */
import { NextRequest } from "next/server"
import { getRoleColumnOptions } from "@/features/admin/roles/server/queries"
import { createGetRoute } from "@/lib/api/api-route-wrapper"
import type { ApiRouteContext } from "@/lib/api/types"
import { createOptionsHandler } from "@/lib/api/options-route-helper"

async function getRoleOptionsHandler(req: NextRequest, _context: ApiRouteContext) {
  return createOptionsHandler(req, {
    allowedColumns: ["name", "displayName"],
    getOptions: (column, search, limit) => getRoleColumnOptions(column, search, limit),
  })
}

// Route Segment Config theo Next.js 16
// LƯU Ý: Phải là static values, không thể từ object (Next.js requirement)
export const dynamic = "force-dynamic"
export const revalidate = false

export const GET = createGetRoute(getRoleOptionsHandler)

