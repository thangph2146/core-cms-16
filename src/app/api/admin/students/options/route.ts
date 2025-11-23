/**
 * API Route: GET /api/admin/students/options - Get filter options for a column
 * 
 * Theo chuẩn Next.js 16: không cache admin data - luôn fetch fresh data
 */
import { NextRequest } from "next/server"
import { getStudentColumnOptions } from "@/features/admin/students/server/queries"
import { createGetRoute } from "@/lib/api/api-route-wrapper"
import type { ApiRouteContext } from "@/lib/api/types"
import { createOptionsHandler } from "@/lib/api/options-route-helper"
import { isSuperAdmin } from "@/lib/permissions"

async function getStudentOptionsHandler(req: NextRequest, context: ApiRouteContext) {
  // Check if user is super admin
  const actorId = context.session.user?.id
  const isSuperAdminUser = isSuperAdmin(context.roles)

  return createOptionsHandler(req, {
    allowedColumns: ["studentCode", "name", "email"],
    getOptions: (column, search, limit) => 
      getStudentColumnOptions(column, search, limit, actorId, isSuperAdminUser),
  })
}

// Route Segment Config theo Next.js 16
// LƯU Ý: Phải là static values, không thể từ object (Next.js requirement)
export const dynamic = "force-dynamic"
export const revalidate = false

export const GET = createGetRoute(getStudentOptionsHandler)

