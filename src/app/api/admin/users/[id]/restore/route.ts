/**
 * API Route: POST /api/admin/users/[id]/restore
 */
import { NextRequest, NextResponse } from "next/server"
import { type AuthContext, restoreUser } from "@/features/admin/users/server/mutations"
import { createPostRoute } from "@/lib/api/api-route-wrapper"
import type { ApiRouteContext } from "@/lib/api/types"
import { validateID } from "@/lib/api/validation"

async function restoreUserHandler(_req: NextRequest, context: ApiRouteContext, ...args: unknown[]) {
  const { params } = args[0] as { params: Promise<{ id: string }> }
  const { id } = await params

  const idValidation = validateID(id)
  if (!idValidation.valid) {
    return NextResponse.json({ error: idValidation.error }, { status: 400 })
  }

  const ctx: AuthContext = {
    actorId: context.session.user?.id ?? "unknown",
    permissions: context.permissions,
    roles: context.roles,
  }

  await restoreUser(ctx, id)
  return NextResponse.json({ success: true })
}

export const POST = createPostRoute(restoreUserHandler)
