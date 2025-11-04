/**
 * API Route: POST /api/users/bulk
 * Body: { action: "delete" | "restore" | "hard-delete", ids: string[] }
 */
import { NextRequest, NextResponse } from "next/server"
import {
  type AuthContext,
  bulkSoftDeleteUsers,
  bulkRestoreUsers,
  bulkHardDeleteUsers,
} from "@/features/users/server/mutations"
import { PERMISSIONS } from "@/lib/permissions"
import { createPostRoute } from "@/lib/api/api-route-wrapper"
import { validateArray, validateEnum, validateID } from "@/lib/api/validation"

type BulkAction = "delete" | "restore" | "hard-delete"

async function bulkUsersHandler(
  req: NextRequest,
  context: {
    session: Awaited<ReturnType<typeof import("@/lib/auth").requireAuth>>
    permissions: import("@/lib/permissions").Permission[]
    roles: Array<{ name: string }>
  }
) {
  const body = await req.json()
  const { action, ids } = body as { action?: BulkAction; ids?: unknown }

  // Validate action
  const actionValidation = validateEnum(action, ["delete", "restore", "hard-delete"] as const, "Action")
  if (!actionValidation.valid) {
    return NextResponse.json({ error: actionValidation.error }, { status: 400 })
  }

  // Validate ids array
  const idsValidation = validateArray<string>(ids, 1, 100, "Danh sách người dùng")
  if (!idsValidation.valid || !idsValidation.value) {
    return NextResponse.json(
      { error: idsValidation.error || "Danh sách người dùng phải có ít nhất 1 phần tử và tối đa 100 phần tử" },
      { status: 400 }
    )
  }

  // Validate all IDs (support UUID, CUID, or other valid formats)
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

  let resultCount = 0

  switch (actionValidation.value) {
    case "delete": {
      // Permission check is handled by wrapper
      const { count } = await bulkSoftDeleteUsers(ctx, idsValidation.value)
      resultCount = count
      break
    }
    case "restore": {
      // Permission check is handled by wrapper
      const { count } = await bulkRestoreUsers(ctx, idsValidation.value)
      resultCount = count
      break
    }
    case "hard-delete": {
      // Permission check is handled by wrapper
      const { count } = await bulkHardDeleteUsers(ctx, idsValidation.value)
      resultCount = count
      break
    }
  }

  return NextResponse.json({ success: true, count: resultCount })
}

// Dynamic permission based on action - use wrapper that checks multiple permissions
export const POST = createPostRoute(bulkUsersHandler, {
  permissions: [PERMISSIONS.USERS_DELETE, PERMISSIONS.USERS_UPDATE, PERMISSIONS.USERS_MANAGE],
})

