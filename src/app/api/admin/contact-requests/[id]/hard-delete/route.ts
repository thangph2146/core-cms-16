/**
 * API Route: DELETE /api/admin/contact-requests/[id]/hard-delete - Hard delete contact request
 */
import { NextRequest, NextResponse } from "next/server"
import {
  hardDeleteContactRequest,
  type AuthContext,
  ApplicationError,
  NotFoundError,
} from "@/features/admin/contact-requests/server/mutations"
import { createDeleteRoute } from "@/lib/api/api-route-wrapper"
import type { ApiRouteContext } from "@/lib/api/types"

async function hardDeleteContactRequestHandler(_req: NextRequest, context: ApiRouteContext, ...args: unknown[]) {
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
    await hardDeleteContactRequest(ctx, contactRequestId)
    return NextResponse.json({ message: "Contact Request permanently deleted" })
  } catch (error) {
    if (error instanceof ApplicationError) {
      return NextResponse.json({ error: error.message || "Không thể xóa vĩnh viễn yêu cầu liên hệ" }, { status: error.status || 400 })
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message || "Không tìm thấy" }, { status: 404 })
    }
    console.error("Error hard deleting contact request:", error)
    return NextResponse.json({ error: "Đã xảy ra lỗi khi xóa vĩnh viễn yêu cầu liên hệ" }, { status: 500 })
  }
}

export const DELETE = createDeleteRoute(hardDeleteContactRequestHandler)

