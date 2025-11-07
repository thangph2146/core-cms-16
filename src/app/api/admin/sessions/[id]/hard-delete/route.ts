/**
 * API Route: DELETE /api/admin/sessions/[id]/hard-delete - Hard delete session
 */
import { NextRequest, NextResponse } from "next/server"
import {
  hardDeleteSession,
  type AuthContext,
  ApplicationError,
  NotFoundError,
} from "@/features/admin/sessions/server/mutations"
import { createDeleteRoute } from "@/lib/api/api-route-wrapper"
import type { ApiRouteContext } from "@/lib/api/types"

async function hardDeleteSessionHandler(_req: NextRequest, context: ApiRouteContext, ...args: unknown[]) {
  const { params } = args[0] as { params: Promise<{ id: string }> }
  const { id: sessionId } = await params

  if (!sessionId) {
    return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
  }

  const ctx: AuthContext = {
    actorId: context.session.user?.id ?? "unknown",
    permissions: context.permissions,
    roles: context.roles,
  }

  try {
    await hardDeleteSession(ctx, sessionId)
    return NextResponse.json({ message: "Session permanently deleted" })
  } catch (error) {
    if (error instanceof ApplicationError) {
      return NextResponse.json({ error: error.message || "Không thể xóa vĩnh viễn session" }, { status: error.status || 400 })
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message || "Không tìm thấy" }, { status: 404 })
    }
    console.error("Error hard deleting session:", error)
    return NextResponse.json({ error: "Đã xảy ra lỗi khi xóa vĩnh viễn session" }, { status: 500 })
  }
}

export const DELETE = createDeleteRoute(hardDeleteSessionHandler)

