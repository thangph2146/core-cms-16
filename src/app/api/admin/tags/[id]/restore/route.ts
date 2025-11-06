/**
 * API Route: POST /api/admin/tags/[id]/restore - Restore tag
 */
import { NextRequest, NextResponse } from "next/server"
import {
  restoreTag,
  type AuthContext,
  ApplicationError,
  NotFoundError,
} from "@/features/admin/tags/server/mutations"
import { createPostRoute } from "@/lib/api/api-route-wrapper"
import type { ApiRouteContext } from "@/lib/api/types"

async function restoreTagHandler(_req: NextRequest, context: ApiRouteContext, ...args: unknown[]) {
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
    await restoreTag(ctx, tagId)
    return NextResponse.json({ message: "Tag restored successfully" })
  } catch (error) {
    if (error instanceof ApplicationError) {
      return NextResponse.json({ error: error.message || "Không thể khôi phục thẻ tag" }, { status: error.status || 400 })
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message || "Không tìm thấy" }, { status: 404 })
    }
    console.error("Error restoring tag:", error)
    return NextResponse.json({ error: "Đã xảy ra lỗi khi khôi phục thẻ tag" }, { status: 500 })
  }
}

export const POST = createPostRoute(restoreTagHandler)

