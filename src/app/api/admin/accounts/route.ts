/**
 * API Route: GET /api/admin/accounts - Get current user's account
 * PUT /api/admin/accounts - Update current user's account
 */
import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserProfile } from "@/features/admin/accounts/server/queries"
import { updateCurrentUserAccount } from "@/features/admin/accounts/server/mutations"
import {
  ApplicationError,
  NotFoundError,
  type AuthContext,
} from "@/features/admin/resources/server"
import { createGetRoute, createPutRoute } from "@/lib/api/api-route-wrapper"
import type { ApiRouteContext } from "@/lib/api/types"
import type { UpdateAccountInput } from "@/features/admin/accounts/types"

async function getAccountHandler(_req: NextRequest, context: ApiRouteContext) {
  const userId = context.session.user?.id

  if (!userId) {
    return NextResponse.json({ error: "Bạn cần đăng nhập để xem thông tin tài khoản" }, { status: 401 })
  }

  // Sử dụng getCurrentUserProfile (non-cached) để đảm bảo data luôn fresh
  // Theo chuẩn Next.js 16: không cache admin data
  const account = await getCurrentUserProfile(userId)
  if (!account) {
    return NextResponse.json({ error: "Không tìm thấy tài khoản" }, { status: 404 })
  }

  return NextResponse.json({ data: account })
}

async function putAccountHandler(req: NextRequest, context: ApiRouteContext) {
  const userId = context.session.user?.id

  if (!userId) {
    return NextResponse.json({ error: "Bạn cần đăng nhập để cập nhật thông tin tài khoản" }, { status: 401 })
  }

  let payload: UpdateAccountInput
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại." }, { status: 400 })
  }

  // Chỉ cho phép cập nhật các trường được phép
  const allowedFields = ["name", "bio", "phone", "address", "password", "avatar"]
  const invalidFields = Object.keys(payload).filter((key) => !allowedFields.includes(key))

  if (invalidFields.length > 0) {
    return NextResponse.json(
      { error: `Các trường không hợp lệ: ${invalidFields.join(", ")}`, invalidFields },
      { status: 400 }
    )
  }

  const ctx: AuthContext = {
    actorId: userId,
    permissions: context.permissions,
    roles: context.roles,
  }

  try {
    const updated = await updateCurrentUserAccount(ctx, payload)
    return NextResponse.json({ data: updated })
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message || "Không tìm thấy tài khoản" }, { status: 404 })
    }
    if (error instanceof ApplicationError) {
      return NextResponse.json({ error: error.message || "Không thể cập nhật tài khoản" }, { status: error.status || 400 })
    }
    console.error("Error updating account:", error)
    return NextResponse.json({ error: "Đã xảy ra lỗi khi cập nhật tài khoản" }, { status: 500 })
  }
}

export const GET = createGetRoute(getAccountHandler)
export const PUT = createPutRoute(putAccountHandler)

