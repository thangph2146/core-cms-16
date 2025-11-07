/**
 * API Route: DELETE /api/admin/comments/[id]/hard-delete - Hard delete comment
 */
import { NextRequest, NextResponse } from "next/server"
import {
  hardDeleteComment,
  type AuthContext,
  ApplicationError,
  NotFoundError,
} from "@/features/admin/comments/server/mutations"
import { createDeleteRoute } from "@/lib/api/api-route-wrapper"
import type { ApiRouteContext } from "@/lib/api/types"

async function hardDeleteCommentHandler(_req: NextRequest, context: ApiRouteContext, ...args: unknown[]) {
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
    await hardDeleteComment(ctx, commentId)
    return NextResponse.json({ message: "Comment permanently deleted" })
  } catch (error) {
    if (error instanceof ApplicationError) {
      return NextResponse.json({ error: error.message || "Không thể xóa vĩnh viễn bình luận" }, { status: error.status || 400 })
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message || "Không tìm thấy" }, { status: 404 })
    }
    console.error("Error hard deleting comment:", error)
    return NextResponse.json({ error: "Đã xảy ra lỗi khi xóa vĩnh viễn bình luận" }, { status: 500 })
  }
}

export const DELETE = createDeleteRoute(hardDeleteCommentHandler)

