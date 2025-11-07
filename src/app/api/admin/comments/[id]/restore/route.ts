/**
 * API Route: POST /api/admin/comments/[id]/restore - Restore comment
 */
import { NextRequest, NextResponse } from "next/server"
import {
  restoreComment,
  type AuthContext,
  ApplicationError,
  NotFoundError,
} from "@/features/admin/comments/server/mutations"
import { createPostRoute } from "@/lib/api/api-route-wrapper"
import type { ApiRouteContext } from "@/lib/api/types"

async function restoreCommentHandler(_req: NextRequest, context: ApiRouteContext, ...args: unknown[]) {
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
    await restoreComment(ctx, commentId)
    return NextResponse.json({ message: "Comment restored successfully" })
  } catch (error) {
    if (error instanceof ApplicationError) {
      return NextResponse.json({ error: error.message || "Không thể khôi phục bình luận" }, { status: error.status || 400 })
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message || "Không tìm thấy" }, { status: 404 })
    }
    console.error("Error restoring comment:", error)
    return NextResponse.json({ error: "Đã xảy ra lỗi khi khôi phục bình luận" }, { status: 500 })
  }
}

export const POST = createPostRoute(restoreCommentHandler)

