import { NextRequest, NextResponse } from "next/server"
import { createGetRoute, createPutRoute, createDeleteRoute } from "@/lib/api/api-route-wrapper"
import { updateGroup, deleteGroup, getGroup } from "@/features/admin/chat/server"
import {
  parseRequestBody,
  extractParams,
  getUserId,
  createAuthContext,
  handleApiError,
  getStringValue,
} from "@/lib/api/api-route-helpers"
import type { ApiRouteContext } from "@/lib/api/types"

async function updateGroupHandler(req: NextRequest, context: ApiRouteContext, ...args: unknown[]) {
  const userId = getUserId(context)
  const { id } = await extractParams<{ id: string }>(args)
  const body = await parseRequestBody(req)

  const name = getStringValue(body, "name")
  const description = getStringValue(body, "description")
  const avatar = typeof body.avatar === "string" ? body.avatar : null

  try {
    const group = await updateGroup(createAuthContext(context, userId), {
      groupId: id,
      name,
      description,
      avatar,
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
    return handleApiError(error, "Đã xảy ra lỗi khi cập nhật nhóm", 500)
  }
}

async function deleteGroupHandler(req: NextRequest, context: ApiRouteContext, ...args: unknown[]) {
  const userId = getUserId(context)
  const { id } = await extractParams<{ id: string }>(args)

  try {
    await deleteGroup(createAuthContext(context, userId), id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, "Đã xảy ra lỗi khi xóa nhóm", 500)
  }
}

async function getGroupHandler(req: NextRequest, context: ApiRouteContext, ...args: unknown[]) {
  const userId = getUserId(context)
  const { id } = await extractParams<{ id: string }>(args)

  try {
    const group = await getGroup(id, userId)

    if (!group) {
      return NextResponse.json({ error: "Nhóm không tồn tại hoặc bạn không phải thành viên" }, { status: 404 })
    }

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
        joinedAt: m.joinedAt.toISOString(),
        leftAt: m.leftAt?.toISOString() || null,
        user: m.user,
      })),
      memberCount: group.memberCount,
    })
  } catch (error) {
    return handleApiError(error, "Đã xảy ra lỗi khi lấy thông tin nhóm", 500)
  }
}

export const GET = createGetRoute(getGroupHandler)
export const PUT = createPutRoute(updateGroupHandler)
export const DELETE = createDeleteRoute(deleteGroupHandler)

