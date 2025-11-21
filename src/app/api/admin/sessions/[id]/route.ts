/**
 * API Route: GET /api/admin/sessions/[id] - Get session
 * PUT /api/admin/sessions/[id] - Update session
 * DELETE /api/admin/sessions/[id] - Soft delete session
 */
import { NextRequest, NextResponse } from "next/server"
import { getSessionDetailById } from "@/features/admin/sessions/server/cache"
import { serializeSessionDetail } from "@/features/admin/sessions/server/helpers"
import {
  updateSession,
  softDeleteSession,
  type AuthContext,
  ApplicationError,
  NotFoundError,
} from "@/features/admin/sessions/server/mutations"
import { UpdateSessionSchema } from "@/features/admin/sessions/server/schemas"
import { createGetRoute, createPutRoute, createDeleteRoute } from "@/lib/api/api-route-wrapper"
import type { ApiRouteContext } from "@/lib/api/types"

async function getSessionHandler(_req: NextRequest, _context: ApiRouteContext, ...args: unknown[]) {
  const { params } = args[0] as { params: Promise<{ id: string }> }
  const { id: sessionId } = await params

  if (!sessionId) {
    return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
  }

  const session = await getSessionDetailById(sessionId)

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 })
  }

  return NextResponse.json({ data: serializeSessionDetail(session) })
}

async function putSessionHandler(req: NextRequest, context: ApiRouteContext, ...args: unknown[]) {
  const { params } = args[0] as { params: Promise<{ id: string }> }
  const { id: sessionId } = await params

  if (!sessionId) {
    return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại." }, { status: 400 })
  }

  // Validate body với Zod schema
  const validationResult = UpdateSessionSchema.safeParse(body)
  if (!validationResult.success) {
    const firstError = validationResult.error.issues[0]
    return NextResponse.json({ error: firstError?.message || "Dữ liệu không hợp lệ" }, { status: 400 })
  }

  const ctx: AuthContext = {
    actorId: context.session.user?.id ?? "unknown",
    permissions: context.permissions,
    roles: context.roles,
  }

  try {
    const session = await updateSession(ctx, sessionId, validationResult.data)
    // Serialize session to client format (dates to strings)
    const serialized = {
      id: session.id,
      userId: session.userId,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      isActive: session.isActive,
      expiresAt: session.expiresAt,
      lastActivity: session.lastActivity,
      createdAt: session.createdAt,
      deletedAt: session.deletedAt,
    }
    return NextResponse.json({ data: serialized })
  } catch (error) {
    if (error instanceof ApplicationError) {
      return NextResponse.json({ error: error.message || "Không thể cập nhật session" }, { status: error.status || 400 })
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message || "Không tìm thấy" }, { status: 404 })
    }
    console.error("Error updating session:", error)
    return NextResponse.json({ error: "Đã xảy ra lỗi khi cập nhật session" }, { status: 500 })
  }
}

async function deleteSessionHandler(_req: NextRequest, context: ApiRouteContext, ...args: unknown[]) {
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
    await softDeleteSession(ctx, sessionId)
    return NextResponse.json({ message: "Session deleted successfully" })
  } catch (error) {
    if (error instanceof ApplicationError) {
      return NextResponse.json({ error: error.message || "Không thể xóa session" }, { status: error.status || 400 })
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message || "Không tìm thấy" }, { status: 404 })
    }
    console.error("Error deleting session:", error)
    return NextResponse.json({ error: "Đã xảy ra lỗi khi xóa session" }, { status: 500 })
  }
}

export const GET = createGetRoute(getSessionHandler)
export const PUT = createPutRoute(putSessionHandler)
export const DELETE = createDeleteRoute(deleteSessionHandler)

