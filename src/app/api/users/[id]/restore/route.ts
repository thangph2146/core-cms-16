/**
 * API Route: POST /api/users/[id]/restore
 */
import { NextRequest, NextResponse } from "next/server"
import { requireAuth, getPermissions } from "@/lib/api/auth-server"
import { PERMISSIONS } from "@/lib/permissions"
import { canPerformAction } from "@/lib/permissions-helpers"
import {
  ApplicationError,
  type AuthContext,
  restoreUser,
} from "@/features/users/server/mutations"

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const session = await requireAuth()
    const permissions = await getPermissions()
    const sessionWithRoles = session as typeof session & { roles?: Array<{ name: string }> }
    const roles = sessionWithRoles?.roles ?? []

    if (!canPerformAction(permissions, roles, PERMISSIONS.USERS_UPDATE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const ctx: AuthContext = {
      actorId: session.user?.id ?? "unknown",
      permissions,
      roles,
    }

    await restoreUser(ctx, id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error restoring user:", error)
    if (error instanceof ApplicationError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

