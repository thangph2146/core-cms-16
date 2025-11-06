/**
 * API Route: DELETE /api/admin/tags/[id]/hard-delete - Hard delete tag
 */
import { NextRequest, NextResponse } from "next/server"
import {
  hardDeleteTag,
  type AuthContext,
  ApplicationError,
  NotFoundError,
} from "@/features/admin/tags/server/mutations"
import { createDeleteRoute } from "@/lib/api/api-route-wrapper"
import type { ApiRouteContext } from "@/lib/api/types"

async function hardDeleteTagHandler(_req: NextRequest, context: ApiRouteContext, ...args: unknown[]) {
  const { params } = args[0] as { params: Promise<{ id: string }> }
  const { id: tagId } = await params

  if (!tagId) {
    return NextResponse.json({ error: "Tag ID is required" }, { status: 400 })
  }

  const ctx: AuthContext = {
    actorId: context.session.user?.id ?? "unknown",
    permissions: context.permissions,
    roles: context.roles,
  }

  try {
    await hardDeleteTag(ctx, tagId)
    return NextResponse.json({ message: "Tag permanently deleted" })
  } catch (error) {
    if (error instanceof ApplicationError) {
      return NextResponse.json({ error: error.message || "Không thể xóa vĩnh viễn thẻ tag" }, { status: error.status || 400 })
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message || "Không tìm thấy" }, { status: 404 })
    }
    console.error("Error hard deleting tag:", error)
    return NextResponse.json({ error: "Đã xảy ra lỗi khi xóa vĩnh viễn thẻ tag" }, { status: 500 })
  }
}

export const DELETE = createDeleteRoute(hardDeleteTagHandler)

