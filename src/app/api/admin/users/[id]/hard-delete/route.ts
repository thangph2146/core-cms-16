/**
 * API Route: DELETE /api/admin/users/[id]/hard-delete - Hard delete user (xóa vĩnh viễn)
 */
import { NextRequest, NextResponse } from "next/server"
import { type AuthContext, hardDeleteUser } from "@/features/admin/users/server/mutations"
import { createDeleteRoute } from "@/lib/api/api-route-wrapper"
import type { ApiRouteContext } from "@/lib/api/types"
import { validateID } from "@/lib/api/validation"

async function hardDeleteUserHandler(_req: NextRequest, context: ApiRouteContext, ...args: unknown[]) {
  const { params } = args[0] as { params: Promise<{ id: string }> }
  const { id } = await params

  const idValidation = validateID(id)
  if (!idValidation.valid) {
    return NextResponse.json({ error: idValidation.error }, { status: 400 })
  }

  if (context.session.user?.id === id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 })
  }

  const ctx: AuthContext = {
    actorId: context.session.user?.id ?? "unknown",
    permissions: context.permissions,
    roles: context.roles,
  }

  await hardDeleteUser(ctx, id)
  return NextResponse.json({ success: true })
}

export const DELETE = createDeleteRoute(hardDeleteUserHandler)
