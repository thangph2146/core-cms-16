import { NextRequest, NextResponse } from "next/server"
import { createPostRoute } from "@/lib/api/api-route-wrapper"
import { addGroupMembers } from "@/features/admin/chat/server"
import {
  parseRequestBody,
  extractParams,
  getUserId,
  createAuthContext,
  handleApiError,
  getArrayValue,
} from "@/lib/api/api-route-helpers"
import type { ApiRouteContext } from "@/lib/api/types"

async function addGroupMembersHandler(req: NextRequest, context: ApiRouteContext, ...args: unknown[]) {
  const userId = getUserId(context)
  const { id } = await extractParams<{ id: string }>(args)
  const body = await parseRequestBody(req)

  const memberIds = getArrayValue<string>(body, "memberIds", (id): id is string => typeof id === "string")

  if (memberIds.length === 0) {
    return NextResponse.json({ error: "Phải có ít nhất một thành viên" }, { status: 400 })
  }

  try {
    const result = await addGroupMembers(createAuthContext(context, userId), {
      groupId: id,
      memberIds,
    })
    return NextResponse.json(result)
  } catch (error) {
    return handleApiError(error, "Đã xảy ra lỗi khi thêm thành viên", 500)
  }
}

export const POST = createPostRoute(addGroupMembersHandler)

