/**
 * API Route: POST /api/users/bulk
 * Body: { action: "delete" | "restore" | "hard-delete", ids: string[] }
 */
import { NextRequest, NextResponse } from "next/server"
import { requireAuth, getPermissions } from "@/lib/api/auth-server"
import {
  ApplicationError,
  type AuthContext,
  bulkSoftDeleteUsers,
  bulkRestoreUsers,
  bulkHardDeleteUsers,
} from "@/features/users/server/mutations"
import { PERMISSIONS } from "@/lib/permissions"
import { canPerformAnyAction, canPerformAction } from "@/lib/permissions-helpers"

type BulkAction = "delete" | "restore" | "hard-delete"

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth()
    const permissions = await getPermissions()
    const sessionWithRoles = session as typeof session & { roles?: Array<{ name: string }> }
    const roles = sessionWithRoles?.roles ?? []

    const body = await req.json()
    const { action, ids } = body as { action?: BulkAction; ids?: string[] }

    if (!action || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Thiếu action hoặc danh sách người dùng" },
        { status: 400 },
      )
    }

    const ctx: AuthContext = {
      actorId: session.user?.id ?? "unknown",
      permissions,
      roles,
    }

    let resultCount = 0

    switch (action) {
      case "delete": {
        if (!canPerformAction(permissions, roles, PERMISSIONS.USERS_DELETE)) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }
        const { count } = await bulkSoftDeleteUsers(ctx, ids)
        resultCount = count
        break
      }
      case "restore": {
        if (!canPerformAction(permissions, roles, PERMISSIONS.USERS_UPDATE)) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }
        const { count } = await bulkRestoreUsers(ctx, ids)
        resultCount = count
        break
      }
      case "hard-delete": {
        if (!canPerformAnyAction(permissions, roles, [PERMISSIONS.USERS_MANAGE])) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }
        const { count } = await bulkHardDeleteUsers(ctx, ids)
        resultCount = count
        break
      }
      default:
        return NextResponse.json({ error: "Action không hợp lệ" }, { status: 400 })
    }

    return NextResponse.json({ success: true, count: resultCount })
  } catch (error) {
    console.error("Error executing bulk user action:", error)
    if (error instanceof ApplicationError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

