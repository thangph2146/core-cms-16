/**
 * API Route: POST /api/admin/roles/bulk
 * Body: { action: "delete" | "restore" | "hard-delete", ids: string[] }
 */
import { NextRequest, NextResponse } from "next/server"
import {
  type AuthContext,
  bulkSoftDeleteRoles,
  bulkRestoreRoles,
  bulkHardDeleteRoles,
  ApplicationError,
} from "@/features/admin/roles/server/mutations"
import { BulkRoleActionSchema } from "@/features/admin/roles/server/schemas"
import { PERMISSIONS } from "@/lib/permissions"
import { createPostRoute } from "@/lib/api/api-route-wrapper"
import type { ApiRouteContext } from "@/lib/api/types"

async function bulkRolesHandler(req: NextRequest, context: ApiRouteContext) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại." }, { status: 400 })
  }

  // Validate với Zod
  const validationResult = BulkRoleActionSchema.safeParse(body)
  if (!validationResult.success) {
    const firstError = validationResult.error.issues[0]
    return NextResponse.json({ error: firstError?.message || "Dữ liệu không hợp lệ" }, { status: 400 })
  }

  const { action, ids } = validationResult.data

  const ctx: AuthContext = {
    actorId: context.session.user?.id ?? "unknown",
    permissions: context.permissions,
    roles: context.roles,
  }

  try {
    let result
    if (action === "delete") {
      result = await bulkSoftDeleteRoles(ctx, ids)
    } else if (action === "restore") {
      result = await bulkRestoreRoles(ctx, ids)
    } else {
      result = await bulkHardDeleteRoles(ctx, ids)
    }
    return NextResponse.json({ success: result.success, message: result.message, count: result.affected })
  } catch (error) {
    if (error instanceof ApplicationError) {
      return NextResponse.json({ error: error.message || "Không thể thực hiện thao tác" }, { status: error.status || 400 })
    }
    console.error("Error in bulk roles action:", error)
    return NextResponse.json({ error: "Đã xảy ra lỗi khi thực hiện thao tác" }, { status: 500 })
  }
}

export const POST = createPostRoute(bulkRolesHandler, {
  permissions: [PERMISSIONS.ROLES_DELETE, PERMISSIONS.ROLES_UPDATE, PERMISSIONS.ROLES_MANAGE],
  autoDetectPermissions: false,
})

