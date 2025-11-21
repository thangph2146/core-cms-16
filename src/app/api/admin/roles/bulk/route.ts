/**
 * API Route: POST /api/admin/roles/bulk
 * Body: { action: "delete" | "restore" | "hard-delete", ids: string[] }
 */
import { NextRequest } from "next/server"
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
import { createSuccessResponse, createErrorResponse } from "@/lib/config"

async function bulkRolesHandler(req: NextRequest, context: ApiRouteContext) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return createErrorResponse("Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.", { status: 400 })
  }

  // Validate với zod
  const validationResult = BulkRoleActionSchema.safeParse(body)
  if (!validationResult.success) {
    const firstError = validationResult.error.issues[0]
    return createErrorResponse(firstError?.message || "Dữ liệu không hợp lệ", { status: 400 })
  }

  const validatedBody = validationResult.data

  const ctx: AuthContext = {
    actorId: context.session.user?.id ?? "unknown",
    permissions: context.permissions,
    roles: context.roles,
  }

  try {
    let result
    if (validatedBody.action === "delete") {
      result = await bulkSoftDeleteRoles(ctx, validatedBody.ids)
    } else if (validatedBody.action === "restore") {
      result = await bulkRestoreRoles(ctx, validatedBody.ids)
    } else if (validatedBody.action === "hard-delete") {
      result = await bulkHardDeleteRoles(ctx, validatedBody.ids)
    } else {
      return createErrorResponse("Action không hợp lệ", { status: 400 })
    }

    return createSuccessResponse(result)
  } catch (error) {
    if (error instanceof ApplicationError) {
      return createErrorResponse(error.message || "Không thể thực hiện thao tác hàng loạt", { status: error.status || 400 })
    }
    console.error("Error in bulk roles operation:", error)
    return createErrorResponse("Đã xảy ra lỗi khi thực hiện thao tác hàng loạt", { status: 500 })
  }
}

export const POST = createPostRoute(bulkRolesHandler, {
  permissions: [PERMISSIONS.ROLES_DELETE, PERMISSIONS.ROLES_UPDATE, PERMISSIONS.ROLES_MANAGE],
  autoDetectPermissions: false,
})

