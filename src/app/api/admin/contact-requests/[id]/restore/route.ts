/**
 * API Route: POST /api/admin/contact-requests/[id]/restore - Restore contact request
 */
import { NextRequest, NextResponse } from "next/server"
import {
  restoreContactRequest,
  type AuthContext,
  ApplicationError,
  NotFoundError,
} from "@/features/admin/contact-requests/server/mutations"
import { createPostRoute } from "@/lib/api/api-route-wrapper"
import type { ApiRouteContext } from "@/lib/api/types"

async function restoreContactRequestHandler(_req: NextRequest, context: ApiRouteContext, ...args: unknown[]) {
  const { params } = args[0] as { params: Promise<{ id: string }> }
  const { id: contactRequestId } = await params

  if (!contactRequestId) {
    return NextResponse.json({ error: "Contact Request ID is required" }, { status: 400 })
  }

  const ctx: AuthContext = {
    actorId: context.session.user?.id ?? "unknown",
    permissions: context.permissions,
    roles: context.roles,
  }

  try {
    await restoreContactRequest(ctx, contactRequestId)
    return NextResponse.json({ message: "Contact Request restored successfully" })
  } catch (error) {
    if (error instanceof ApplicationError) {
      return NextResponse.json({ error: error.message || "Không thể khôi phục yêu cầu liên hệ" }, { status: error.status || 400 })
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message || "Không tìm thấy" }, { status: 404 })
    }
    console.error("Error restoring contact request:", error)
    return NextResponse.json({ error: "Đã xảy ra lỗi khi khôi phục yêu cầu liên hệ" }, { status: 500 })
  }
}

export const POST = createPostRoute(restoreContactRequestHandler)

