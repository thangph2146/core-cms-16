/**
 * API Route: GET /api/users/[id], PUT /api/users/[id], DELETE /api/users/[id]
 */
import { NextRequest, NextResponse } from "next/server"
import { requireAuth, getPermissions } from "@/lib/api/auth-server"
import { PERMISSIONS } from "@/lib/permissions"
import { canPerformAction } from "@/lib/permissions-helpers"
import { getUserById } from "@/features/users/server/queries"
import {
  ApplicationError,
  type AuthContext,
  updateUser,
  softDeleteUser,
} from "@/features/users/server/mutations"

function buildAuthContext(
  session: Awaited<ReturnType<typeof requireAuth>>,
  permissions: Awaited<ReturnType<typeof getPermissions>>,
  roles: Array<{ name: string }>,
): AuthContext {
  return {
    actorId: session.user?.id ?? "unknown",
    permissions,
    roles,
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const session = await requireAuth()
    const permissions = await getPermissions()
    const sessionWithRoles = session as typeof session & { roles?: Array<{ name: string }> }
    const roles = sessionWithRoles?.roles ?? []

    if (!canPerformAction(permissions, roles, PERMISSIONS.USERS_VIEW)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const user = await getUserById(id)

    if (!user || user.deletedAt) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ data: user })
  } catch (error) {
    console.error("Error fetching user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
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

    const payload = await req.json()
    const ctx = buildAuthContext(session, permissions, roles)

    const updated = await updateUser(ctx, id, payload)

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error("Error updating user:", error)
    if (error instanceof ApplicationError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const session = await requireAuth()
    const permissions = await getPermissions()
    const sessionWithRoles = session as typeof session & { roles?: Array<{ name: string }> }
    const roles = sessionWithRoles?.roles ?? []

    if (!canPerformAction(permissions, roles, PERMISSIONS.USERS_DELETE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (session.user?.id === id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 },
      )
    }

    const ctx = buildAuthContext(session, permissions, roles)

    await softDeleteUser(ctx, id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting user:", error)
    if (error instanceof ApplicationError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

