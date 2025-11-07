/**
 * API Route: POST /api/admin/sessions/[id]/restore - Restore session
 */
import { NextRequest, NextResponse } from "next/server"
import {
  restoreSession,
  type AuthContext,
  ApplicationError,
  NotFoundError,
} from "@/features/admin/sessions/server/mutations"
import { createPostRoute } from "@/lib/api/api-route-wrapper"
import type { ApiRouteContext } from "@/lib/api/types"

async function restoreSessionHandler(_req: NextRequest, context: ApiRouteContext, ...args: unknown[]) {
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
    await restoreSession(ctx, sessionId)
    return NextResponse.json({ message: "Session restored successfully" })
  } catch (error) {
    if (error instanceof ApplicationError) {
      return NextResponse.json({ error: error.message || "Không thể khôi phục session" }, { status: error.status || 400 })
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message || "Không tìm thấy" }, { status: 404 })
    }
    console.error("Error restoring session:", error)
    return NextResponse.json({ error: "Đã xảy ra lỗi khi khôi phục session" }, { status: 500 })
  }
}

export const POST = createPostRoute(restoreSessionHandler)

