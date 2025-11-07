/**
 * API Route: POST /api/admin/comments/[id]/unapprove - Unapprove comment
 */
import { NextRequest, NextResponse } from "next/server"
import {
  unapproveComment,
  type AuthContext,
  ApplicationError,
  NotFoundError,
} from "@/features/admin/comments/server/mutations"
import { createPostRoute } from "@/lib/api/api-route-wrapper"
import type { ApiRouteContext } from "@/lib/api/types"

async function unapproveCommentHandler(_req: NextRequest, context: ApiRouteContext, ...args: unknown[]) {
  const { params } = args[0] as { params: Promise<{ id: string }> }
  const { id: commentId } = await params

  if (!commentId) {
    return NextResponse.json({ error: "Comment ID is required" }, { status: 400 })
  }

  const ctx: AuthContext = {
    actorId: context.session.user?.id ?? "unknown",
    permissions: context.permissions,
    roles: context.roles,
  }

  try {
    await unapproveComment(ctx, commentId)
    return NextResponse.json({ message: "Comment unapproved successfully" })
  } catch (error) {
    if (error instanceof ApplicationError) {
      return NextResponse.json({ error: error.message || "Không thể hủy duyệt bình luận" }, { status: error.status || 400 })
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message || "Không tìm thấy" }, { status: 404 })
    }
    console.error("Error unapproving comment:", error)
    return NextResponse.json({ error: "Đã xảy ra lỗi khi hủy duyệt bình luận" }, { status: 500 })
  }
}

export const POST = createPostRoute(unapproveCommentHandler)

