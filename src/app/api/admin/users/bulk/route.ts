/**
 * API Route: POST /api/admin/users/bulk
 * Body: { action: "delete" | "restore" | "hard-delete", ids: string[] }
 */
import { NextRequest, NextResponse } from "next/server"
import {
  type AuthContext,
  bulkSoftDeleteUsers,
  bulkRestoreUsers,
  bulkHardDeleteUsers,
} from "@/features/admin/users/server/mutations"
import { PERMISSIONS } from "@/lib/permissions"
import { createPostRoute } from "@/lib/api/api-route-wrapper"
import type { ApiRouteContext } from "@/lib/api/types"
import { validateArray, validateEnum, validateID } from "@/lib/api/validation"

type BulkAction = "delete" | "restore" | "hard-delete"

async function bulkUsersHandler(req: NextRequest, context: ApiRouteContext) {
  const body = await req.json()
  const { action, ids } = body as { action?: BulkAction; ids?: unknown }

  const actionValidation = validateEnum(action, ["delete", "restore", "hard-delete"] as const, "Action")
  if (!actionValidation.valid) {
    return NextResponse.json({ error: actionValidation.error }, { status: 400 })
  }

  const idsValidation = validateArray<string>(ids, 1, 100, "Danh sách người dùng")
  if (!idsValidation.valid || !idsValidation.value) {
    return NextResponse.json(
      { error: idsValidation.error || "Danh sách người dùng phải có ít nhất 1 phần tử và tối đa 100 phần tử" },
      { status: 400 }
    )
  }

  for (const id of idsValidation.value) {
    const idValidation = validateID(id)
    if (!idValidation.valid) {
      return NextResponse.json({ error: `ID không hợp lệ: ${id}` }, { status: 400 })
    }
  }

  const ctx: AuthContext = {
    actorId: context.session.user?.id ?? "unknown",
    permissions: context.permissions,
    roles: context.roles,
  }

  const actions: Record<BulkAction, typeof bulkSoftDeleteUsers> = {
    delete: bulkSoftDeleteUsers,
    restore: bulkRestoreUsers,
    "hard-delete": bulkHardDeleteUsers,
  }

  const { count } = await actions[actionValidation.value!](ctx, idsValidation.value!)
  return NextResponse.json({ success: true, count })
}

export const POST = createPostRoute(bulkUsersHandler, {
  permissions: [PERMISSIONS.USERS_DELETE, PERMISSIONS.USERS_UPDATE, PERMISSIONS.USERS_MANAGE],
  autoDetectPermissions: false,
})
