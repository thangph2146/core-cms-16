import { NextRequest, NextResponse } from "next/server"
import { createGetRoute, createPostRoute } from "@/lib/api/api-route-wrapper"
import { createGroup, listGroups } from "@/features/admin/chat/server"
import {
  parseRequestBody,
  getUserId,
  createAuthContext,
  handleApiError,
  getStringValue,
  getArrayValue,
} from "@/lib/api/api-route-helpers"
import type { ApiRouteContext } from "@/lib/api/types"

async function createGroupHandler(req: NextRequest, context: ApiRouteContext) {
  const userId = getUserId(context)
  const body = await parseRequestBody(req)

  const name = getStringValue(body, "name")
  const description = getStringValue(body, "description")
  const avatar = typeof body.avatar === "string" ? body.avatar : null
  const memberIds = getArrayValue<string>(body, "memberIds", (id): id is string => typeof id === "string")

  if (!name) {
    return NextResponse.json({ error: "Tên nhóm là bắt buộc" }, { status: 400 })
  }

  try {
    const group = await createGroup(createAuthContext(context, userId), {
      name,
      description,
      avatar,
      memberIds,
    })

    return NextResponse.json({
      id: group.id,
      name: group.name,
      description: group.description,
      avatar: group.avatar,
      createdById: group.createdById,
      createdAt: group.createdAt.toISOString(),
      updatedAt: group.updatedAt.toISOString(),
      members: group.members.map((m) => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        user: m.user,
      })),
      memberCount: group.members.length,
    })
  } catch (error) {
    return handleApiError(error, "Đã xảy ra lỗi khi tạo nhóm", 500)
  }
}

async function listGroupsHandler(req: NextRequest, context: ApiRouteContext) {
  const userId = getUserId(context)

  const searchParams = req.nextUrl.searchParams
  const page = parseInt(searchParams.get("page") || "1", 10)
  const limit = parseInt(searchParams.get("limit") || "50", 10)
  const search = searchParams.get("search") || undefined

  try {
    const result = await listGroups({ userId, page, limit, search })
    return NextResponse.json(result)
  } catch (error) {
    return handleApiError(error, "Đã xảy ra lỗi khi lấy danh sách nhóm", 500)
  }
}

export const POST = createPostRoute(createGroupHandler)
export const GET = createGetRoute(listGroupsHandler)

