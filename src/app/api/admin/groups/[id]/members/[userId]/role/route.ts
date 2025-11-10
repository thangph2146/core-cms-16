import { NextRequest, NextResponse } from "next/server"
import { createPatchRoute } from "@/lib/api/api-route-wrapper"
import { updateGroupMemberRole } from "@/features/admin/chat/server"
import {
  parseRequestBody,
  extractParams,
  getUserId,
  createAuthContext,
  handleApiError,
  getStringValue,
} from "@/lib/api/api-route-helpers"
import type { ApiRouteContext } from "@/lib/api/types"

async function updateGroupMemberRoleHandler(req: NextRequest, context: ApiRouteContext, ...args: unknown[]) {
  const userId = getUserId(context)
  const { id: groupId, userId: memberId } = await extractParams<{ id: string; userId: string }>(args)
  const body = await parseRequestBody(req)

  const role = getStringValue(body, "role")
  if (!role || (role !== "ADMIN" && role !== "MEMBER")) {
    return NextResponse.json({ error: "Vai trò không hợp lệ" }, { status: 400 })
  }

  try {
    await updateGroupMemberRole(createAuthContext(context, userId), { groupId, memberId, role })
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, "Đã xảy ra lỗi khi cập nhật vai trò", 500)
  }
}

export const PATCH = createPatchRoute(updateGroupMemberRoleHandler)

