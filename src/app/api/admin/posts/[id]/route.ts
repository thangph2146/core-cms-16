import { NextRequest, NextResponse } from "next/server"
import { getPostById } from "@/features/admin/posts/server/queries"
import { serializePostDetail } from "@/features/admin/posts/server/helpers"
import { updatePost, deletePost, type AuthContext, ApplicationError, NotFoundError } from "@/features/admin/posts/server/mutations"
import { updatePostSchema } from "@/features/admin/posts/server/validation"
import { createGetRoute, createPutRoute, createDeleteRoute } from "@/lib/api/api-route-wrapper"
import type { ApiRouteContext } from "@/lib/api/types"
import { validateID } from "@/lib/api/validation"

async function getPostHandler(_req: NextRequest, _context: ApiRouteContext, ...args: unknown[]) {
  const { params } = args[0] as { params: Promise<{ id: string }> }
  const { id } = await params

  const idValidation = validateID(id)
  if (!idValidation.valid) {
    return NextResponse.json({ error: idValidation.error || "ID không hợp lệ" }, { status: 400 })
  }

  // Sử dụng getPostById (non-cached) để đảm bảo data luôn fresh
  // Theo chuẩn Next.js 16: không cache admin data trong API routes
  const post = await getPostById(id)

  if (!post) {
    return NextResponse.json({ error: "Không tìm thấy bài viết" }, { status: 404 })
  }

  return NextResponse.json({ data: serializePostDetail(post) })
}

async function putPostHandler(req: NextRequest, context: ApiRouteContext, ...args: unknown[]) {
  const { params } = args[0] as { params: Promise<{ id: string }> }
  const { id } = await params

  const idValidation = validateID(id)
  if (!idValidation.valid) {
    return NextResponse.json({ error: idValidation.error || "ID không hợp lệ" }, { status: 400 })
  }

  let payload: Record<string, unknown>
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại." }, { status: 400 })
  }

  // Validate body với Zod schema
  const validationResult = updatePostSchema.safeParse(payload)
  if (!validationResult.success) {
    const firstError = validationResult.error.issues[0]
    return NextResponse.json({ error: firstError?.message || "Dữ liệu không hợp lệ" }, { status: 400 })
  }

  const ctx: AuthContext = {
    actorId: context.session.user?.id ?? "unknown",
    permissions: context.permissions,
    roles: context.roles,
  }

  try {
    const updated = await updatePost(ctx, id, validationResult.data)
    return NextResponse.json({ data: updated })
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message || "Không tìm thấy bài viết" }, { status: 404 })
    }
    if (error instanceof ApplicationError) {
      return NextResponse.json({ error: error.message || "Không thể cập nhật bài viết" }, { status: error.status || 400 })
    }
    // Log lỗi chi tiết để debug
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error("Error updating post:", {
      postId: id,
      error: errorMessage,
      stack: errorStack,
      payload: validationResult.data,
    })
    return NextResponse.json({ 
      error: errorMessage || "Đã xảy ra lỗi khi cập nhật bài viết",
      details: process.env.NODE_ENV === "development" ? errorMessage : undefined,
    }, { status: 500 })
  }
}

async function deletePostHandler(_req: NextRequest, context: ApiRouteContext, ...args: unknown[]) {
  const { params } = args[0] as { params: Promise<{ id: string }> }
  const { id } = await params

  const idValidation = validateID(id)
  if (!idValidation.valid) {
    return NextResponse.json({ error: idValidation.error }, { status: 400 })
  }

  const ctx: AuthContext = {
    actorId: context.session.user?.id ?? "unknown",
    permissions: context.permissions,
    roles: context.roles,
  }

  try {
    await deletePost(ctx, id)
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message || "Không tìm thấy bài viết" }, { status: 404 })
    }
    if (error instanceof ApplicationError) {
      return NextResponse.json({ error: error.message || "Không thể xóa bài viết" }, { status: error.status || 400 })
    }
    console.error("Error deleting post:", error)
    return NextResponse.json({ error: "Đã xảy ra lỗi khi xóa bài viết" }, { status: 500 })
  }
}

export const GET = createGetRoute(getPostHandler)
export const PUT = createPutRoute(putPostHandler)
export const DELETE = createDeleteRoute(deletePostHandler)

