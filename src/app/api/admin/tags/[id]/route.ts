/**
 * API Route: GET /api/admin/tags/[id] - Get tag
 * PUT /api/admin/tags/[id] - Update tag
 * DELETE /api/admin/tags/[id] - Soft delete tag
 */
import { NextRequest, NextResponse } from "next/server"
import { getTagById } from "@/features/admin/tags/server/queries"
import { serializeTagDetail } from "@/features/admin/tags/server/helpers"
import {
  updateTag,
  softDeleteTag,
  type AuthContext,
  ApplicationError,
  NotFoundError,
} from "@/features/admin/tags/server/mutations"
import { createGetRoute, createPutRoute, createDeleteRoute } from "@/lib/api/api-route-wrapper"
import type { ApiRouteContext } from "@/lib/api/types"

async function getTagHandler(_req: NextRequest, _context: ApiRouteContext, ...args: unknown[]) {
  const { params } = args[0] as { params: Promise<{ id: string }> }
  const { id: tagId } = await params

  if (!tagId) {
    return NextResponse.json({ error: "Tag ID is required" }, { status: 400 })
  }

  // Sử dụng getTagById (non-cached) thay vì getTagDetailById để đảm bảo data luôn fresh
  // API routes cần fresh data, không nên sử dụng cache để tránh trả về dữ liệu cũ
  const tag = await getTagById(tagId)

  if (!tag) {
    return NextResponse.json({ error: "Tag not found" }, { status: 404 })
  }

  return NextResponse.json({ data: serializeTagDetail(tag) })
}

async function putTagHandler(req: NextRequest, context: ApiRouteContext, ...args: unknown[]) {
  const { params } = args[0] as { params: Promise<{ id: string }> }
  const { id: tagId } = await params

  if (!tagId) {
    return NextResponse.json({ error: "Tag ID is required" }, { status: 400 })
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
    const tag = await updateTag(ctx, tagId, body)
    // Serialize tag to client format (dates to strings)
    const serialized = {
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      createdAt: tag.createdAt.toISOString(),
      deletedAt: tag.deletedAt ? tag.deletedAt.toISOString() : null,
    }
    return NextResponse.json({ data: serialized })
  } catch (error) {
    if (error instanceof ApplicationError) {
      return NextResponse.json({ error: error.message || "Không thể cập nhật thẻ tag" }, { status: error.status || 400 })
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message || "Không tìm thấy" }, { status: 404 })
    }
    console.error("Error updating tag:", error)
    return NextResponse.json({ error: "Đã xảy ra lỗi khi cập nhật thẻ tag" }, { status: 500 })
  }
}

async function deleteTagHandler(_req: NextRequest, context: ApiRouteContext, ...args: unknown[]) {
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
    await softDeleteTag(ctx, tagId)
    return NextResponse.json({ message: "Tag deleted successfully" })
  } catch (error) {
    if (error instanceof ApplicationError) {
      return NextResponse.json({ error: error.message || "Không thể xóa thẻ tag" }, { status: error.status || 400 })
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message || "Không tìm thấy" }, { status: 404 })
    }
    console.error("Error deleting tag:", error)
    return NextResponse.json({ error: "Đã xảy ra lỗi khi xóa thẻ tag" }, { status: 500 })
  }
}

export const GET = createGetRoute(getTagHandler)
export const PUT = createPutRoute(putTagHandler)
export const DELETE = createDeleteRoute(deleteTagHandler)

