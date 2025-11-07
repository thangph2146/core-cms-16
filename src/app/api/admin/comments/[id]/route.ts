/**
 * API Route: GET /api/admin/comments/[id] - Get comment
 * PUT /api/admin/comments/[id] - Update comment
 * DELETE /api/admin/comments/[id] - Soft delete comment
 */
import { NextRequest, NextResponse } from "next/server"
import { getCommentDetailById } from "@/features/admin/comments/server/cache"
import { serializeCommentDetail } from "@/features/admin/comments/server/helpers"
import {
  updateComment,
  softDeleteComment,
  type AuthContext,
  ApplicationError,
  NotFoundError,
} from "@/features/admin/comments/server/mutations"
import { createGetRoute, createPutRoute, createDeleteRoute } from "@/lib/api/api-route-wrapper"
import type { ApiRouteContext } from "@/lib/api/types"

async function getCommentHandler(_req: NextRequest, _context: ApiRouteContext, ...args: unknown[]) {
  const { params } = args[0] as { params: Promise<{ id: string }> }
  const { id: commentId } = await params

  if (!commentId) {
    return NextResponse.json({ error: "Comment ID is required" }, { status: 400 })
  }

  const comment = await getCommentDetailById(commentId)

  if (!comment) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 })
  }

  return NextResponse.json({ data: serializeCommentDetail(comment) })
}

async function putCommentHandler(req: NextRequest, context: ApiRouteContext, ...args: unknown[]) {
  const { params } = args[0] as { params: Promise<{ id: string }> }
  const { id: commentId } = await params

  if (!commentId) {
    return NextResponse.json({ error: "Comment ID is required" }, { status: 400 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại." }, { status: 400 })
  }

  const ctx: AuthContext = {
    actorId: context.session.user?.id ?? "unknown",
    permissions: context.permissions,
    roles: context.roles,
  }

  try {
    const comment = await updateComment(ctx, commentId, body)
    // Serialize comment to client format
    const serialized = {
      id: comment.id,
      content: comment.content,
      approved: comment.approved,
      authorId: comment.authorId,
      authorName: comment.authorName,
      authorEmail: comment.authorEmail,
      postId: comment.postId,
      postTitle: comment.postTitle,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      deletedAt: comment.deletedAt,
    }
    return NextResponse.json({ data: serialized })
  } catch (error) {
    if (error instanceof ApplicationError) {
      return NextResponse.json({ error: error.message || "Không thể cập nhật bình luận" }, { status: error.status || 400 })
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message || "Không tìm thấy" }, { status: 404 })
    }
    console.error("Error updating comment:", error)
    return NextResponse.json({ error: "Đã xảy ra lỗi khi cập nhật bình luận" }, { status: 500 })
  }
}

async function deleteCommentHandler(_req: NextRequest, context: ApiRouteContext, ...args: unknown[]) {
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
    await softDeleteComment(ctx, commentId)
    return NextResponse.json({ message: "Comment deleted successfully" })
  } catch (error) {
    if (error instanceof ApplicationError) {
      return NextResponse.json({ error: error.message || "Không thể xóa bình luận" }, { status: error.status || 400 })
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message || "Không tìm thấy" }, { status: 404 })
    }
    console.error("Error deleting comment:", error)
    return NextResponse.json({ error: "Đã xảy ra lỗi khi xóa bình luận" }, { status: 500 })
  }
}

export const GET = createGetRoute(getCommentHandler)
export const PUT = createPutRoute(putCommentHandler)
export const DELETE = createDeleteRoute(deleteCommentHandler)

