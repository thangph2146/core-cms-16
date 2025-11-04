/**
 * API Route: GET /api/users/[id], PUT /api/users/[id], DELETE /api/users/[id]
 */
import { NextRequest, NextResponse } from "next/server"
import { PERMISSIONS } from "@/lib/permissions"
import { getUserById } from "@/features/admin/users/server/queries"
import {
  type AuthContext,
  updateUser,
  softDeleteUser,
} from "@/features/admin/users/server/mutations"
import {
  createGetRoute,
  createPutRoute,
  createDeleteRoute,
} from "@/lib/api/api-route-wrapper"
import { validateID } from "@/lib/api/validation"

async function getUserHandler(
  _req: NextRequest,
  context: {
    session: Awaited<ReturnType<typeof import("@/lib/auth").requireAuth>>
    permissions: import("@/lib/permissions").Permission[]
    roles: Array<{ name: string }>
  },
  ...args: unknown[]
) {
  const { params } = args[0] as { params: Promise<{ id: string }> }
  const { id } = await params

  // Validate ID (UUID or CUID)
  const idValidation = validateID(id)
  if (!idValidation.valid) {
    return NextResponse.json({ error: idValidation.error }, { status: 400 })
  }

  const user = await getUserById(id)

  if (!user || user.deletedAt) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  return NextResponse.json({ data: user })
}

async function putUserHandler(
  req: NextRequest,
  context: {
    session: Awaited<ReturnType<typeof import("@/lib/auth").requireAuth>>
    permissions: import("@/lib/permissions").Permission[]
    roles: Array<{ name: string }>
  },
  ...args: unknown[]
) {
  const { params } = args[0] as { params: Promise<{ id: string }> }
  const { id } = await params

  // Validate ID (UUID or CUID)
  const idValidation = validateID(id)
  if (!idValidation.valid) {
    return NextResponse.json({ error: idValidation.error }, { status: 400 })
  }

  const payload = await req.json()
  const ctx: AuthContext = {
    actorId: context.session.user?.id ?? "unknown",
    permissions: context.permissions,
    roles: context.roles,
  }

  const updated = await updateUser(ctx, id, payload)

  return NextResponse.json({ data: updated })
}

async function deleteUserHandler(
  _req: NextRequest,
  context: {
    session: Awaited<ReturnType<typeof import("@/lib/auth").requireAuth>>
    permissions: import("@/lib/permissions").Permission[]
    roles: Array<{ name: string }>
  },
  ...args: unknown[]
) {
  const { params } = args[0] as { params: Promise<{ id: string }> }
  const { id } = await params

  // Validate ID (UUID or CUID)
  const idValidation = validateID(id)
  if (!idValidation.valid) {
    return NextResponse.json({ error: idValidation.error }, { status: 400 })
  }

  // Prevent self-deletion
  if (context.session.user?.id === id) {
    return NextResponse.json(
      { error: "Cannot delete your own account" },
      { status: 400 }
    )
  }

  const ctx: AuthContext = {
    actorId: context.session.user?.id ?? "unknown",
    permissions: context.permissions,
    roles: context.roles,
  }

  await softDeleteUser(ctx, id)

  return NextResponse.json({ success: true })
}

export const GET = createGetRoute(getUserHandler, {
  permissions: PERMISSIONS.USERS_VIEW,
})

export const PUT = createPutRoute(putUserHandler, {
  permissions: PERMISSIONS.USERS_UPDATE,
})

export const DELETE = createDeleteRoute(deleteUserHandler, {
  permissions: PERMISSIONS.USERS_DELETE,
})

