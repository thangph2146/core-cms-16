/**
 * API Route: GET /api/admin/roles/[id], PUT /api/admin/roles/[id], DELETE /api/admin/roles/[id]
 */
import { NextRequest, NextResponse } from "next/server"
import { getRoleById } from "@/features/admin/roles/server/queries"
import { serializeRoleDetail } from "@/features/admin/roles/server/helpers"
import {
  type AuthContext,
  updateRole,
  softDeleteRole,
  ApplicationError,
  NotFoundError,
} from "@/features/admin/roles/server/mutations"
import { createGetRoute, createPutRoute, createDeleteRoute } from "@/lib/api/api-route-wrapper"
import type { ApiRouteContext } from "@/lib/api/types"
import { validateID } from "@/lib/api/validation"

async function getRoleHandler(_req: NextRequest, _context: ApiRouteContext, ...args: unknown[]) {
  const { params } = args[0] as { params: Promise<{ id: string }> }
  const { id } = await params

  const idValidation = validateID(id)
  if (!idValidation.valid) {
    return NextResponse.json({ error: idValidation.error || "ID không hợp lệ" }, { status: 400 })
  }

  // Sử dụng getRoleById (non-cached) để đảm bảo data luôn fresh
  // Theo chuẩn Next.js 16: không cache admin data trong API routes
  const role = await getRoleById(id)
  if (!role || role.deletedAt) {
    return NextResponse.json({ error: role ? "Vai trò đã bị xóa" : "Không tìm thấy vai trò" }, { status: 404 })
  }

  return NextResponse.json({ data: serializeRoleDetail(role) })
}

async function putRoleHandler(req: NextRequest, context: ApiRouteContext, ...args: unknown[]) {
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

  const ctx: AuthContext = {
    actorId: context.session.user?.id ?? "unknown",
    permissions: context.permissions,
    roles: context.roles,
  }

  try {
    const updated = await updateRole(ctx, id, payload)
    return NextResponse.json({ data: updated })
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message || "Không tìm thấy vai trò" }, { status: 404 })
    }
    if (error instanceof ApplicationError) {
      return NextResponse.json({ error: error.message || "Không thể cập nhật vai trò" }, { status: error.status || 400 })
    }
    console.error("Error updating role:", error)
    return NextResponse.json({ error: "Đã xảy ra lỗi khi cập nhật vai trò" }, { status: 500 })
  }
}

async function deleteRoleHandler(_req: NextRequest, context: ApiRouteContext, ...args: unknown[]) {
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
    await softDeleteRole(ctx, id)
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message || "Không tìm thấy vai trò" }, { status: 404 })
    }
    if (error instanceof ApplicationError) {
      return NextResponse.json({ error: error.message || "Không thể xóa vai trò" }, { status: error.status || 400 })
    }
    console.error("Error deleting role:", error)
    return NextResponse.json({ error: "Đã xảy ra lỗi khi xóa vai trò" }, { status: 500 })
  }
}

export const GET = createGetRoute(getRoleHandler)
export const PUT = createPutRoute(putRoleHandler)
export const DELETE = createDeleteRoute(deleteRoleHandler)

