/**
 * API Route: GET /api/admin/users/[id], PUT /api/admin/users/[id], DELETE /api/admin/users/[id]
 */
import { NextRequest, NextResponse } from "next/server"
import { getUserDetailById } from "@/features/admin/users/server/queries"
import {
  type AuthContext,
  updateUser,
  softDeleteUser,
  ApplicationError,
  NotFoundError,
} from "@/features/admin/users/server/mutations"
import { createGetRoute, createPutRoute, createDeleteRoute } from "@/lib/api/api-route-wrapper"
import type { ApiRouteContext } from "@/lib/api/types"
import { validateID } from "@/lib/api/validation"

async function getUserHandler(_req: NextRequest, _context: ApiRouteContext, ...args: unknown[]) {
  const { params } = args[0] as { params: Promise<{ id: string }> }
  const { id } = await params

  const idValidation = validateID(id)
  if (!idValidation.valid) {
    return NextResponse.json({ error: idValidation.error || "ID không hợp lệ" }, { status: 400 })
  }

  const user = await getUserDetailById(id)
  if (!user || user.deletedAt) {
    return NextResponse.json({ error: user ? "Người dùng đã bị xóa" : "Không tìm thấy người dùng" }, { status: 404 })
  }

  return NextResponse.json({ data: user })
}

async function putUserHandler(req: NextRequest, context: ApiRouteContext, ...args: unknown[]) {
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

  const allowedFields = ["email", "name", "password", "roleIds", "isActive", "bio", "phone", "address"]
  const invalidFields = Object.keys(payload).filter((key) => !allowedFields.includes(key))

  if (invalidFields.length > 0) {
    return NextResponse.json({ error: `Các trường không hợp lệ: ${invalidFields.join(", ")}`, invalidFields }, { status: 400 })
  }

  if (payload.email && typeof payload.email === "string" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    return NextResponse.json({ error: "Email không hợp lệ" }, { status: 400 })
  }

  if (payload.password && typeof payload.password === "string" && payload.password.length < 6) {
    return NextResponse.json({ error: "Mật khẩu phải có ít nhất 6 ký tự" }, { status: 400 })
  }

  if (payload.roleIds !== undefined) {
    if (!Array.isArray(payload.roleIds)) {
      return NextResponse.json({ error: "roleIds phải là một mảng" }, { status: 400 })
    }
    const invalidRoleIds = payload.roleIds.filter((roleId: unknown) => typeof roleId !== "string" || roleId.trim() === "")
    if (invalidRoleIds.length > 0) {
      return NextResponse.json({ error: "Một số roleIds không hợp lệ" }, { status: 400 })
    }
  }

  const ctx: AuthContext = {
    actorId: context.session.user?.id ?? "unknown",
    permissions: context.permissions,
    roles: context.roles,
  }

  try {
    const updated = await updateUser(ctx, id, payload)
    return NextResponse.json({ data: updated })
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message || "Không tìm thấy người dùng" }, { status: 404 })
    }
    if (error instanceof ApplicationError) {
      return NextResponse.json({ error: error.message || "Không thể cập nhật người dùng" }, { status: error.status || 400 })
    }
    console.error("Error updating user:", error)
    return NextResponse.json({ error: "Đã xảy ra lỗi khi cập nhật người dùng" }, { status: 500 })
  }
}

async function deleteUserHandler(_req: NextRequest, context: ApiRouteContext, ...args: unknown[]) {
  const { params } = args[0] as { params: Promise<{ id: string }> }
  const { id } = await params

  const idValidation = validateID(id)
  if (!idValidation.valid) {
    return NextResponse.json({ error: idValidation.error }, { status: 400 })
  }

  if (context.session.user?.id === id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 })
  }

  const ctx: AuthContext = {
    actorId: context.session.user?.id ?? "unknown",
    permissions: context.permissions,
    roles: context.roles,
  }

  await softDeleteUser(ctx, id)
  return NextResponse.json({ success: true })
}

export const GET = createGetRoute(getUserHandler)
export const PUT = createPutRoute(putUserHandler)
export const DELETE = createDeleteRoute(deleteUserHandler)
