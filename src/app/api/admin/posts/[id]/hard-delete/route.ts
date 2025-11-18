/**
 * API Route: DELETE /api/admin/posts/[id]/hard-delete - Hard delete post
 */
import { NextRequest } from "next/server"
import {
  hardDeletePost,
  type AuthContext,
  ApplicationError,
  NotFoundError,
} from "@/features/admin/posts/server/mutations"
import { createDeleteRoute } from "@/lib/api/api-route-wrapper"
import type { ApiRouteContext } from "@/lib/api/types"
import { createErrorResponse, createSuccessResponse } from "@/lib/config"

async function hardDeletePostHandler(_req: NextRequest, context: ApiRouteContext, ...args: unknown[]) {
  const { params } = args[0] as { params: Promise<{ id: string }> }
  const { id: postId } = await params

  if (!postId) {
    return createErrorResponse("Post ID is required", { status: 400 })
  }

  const ctx: AuthContext = {
    actorId: context.session.user?.id ?? "unknown",
    permissions: context.permissions,
    roles: context.roles,
  }

  try {
    await hardDeletePost(ctx, postId)
    return createSuccessResponse({ message: "Post permanently deleted" })
  } catch (error) {
    if (error instanceof ApplicationError) {
      return createErrorResponse(error.message || "Không thể xóa vĩnh viễn bài viết", { status: error.status || 400 })
    }
    if (error instanceof NotFoundError) {
      return createErrorResponse(error.message || "Không tìm thấy", { status: 404 })
    }
    console.error("Error hard deleting post:", error)
    return createErrorResponse("Đã xảy ra lỗi khi xóa vĩnh viễn bài viết", { status: 500 })
  }
}

export const DELETE = createDeleteRoute(hardDeletePostHandler)

