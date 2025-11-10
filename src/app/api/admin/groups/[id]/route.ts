import { NextRequest, NextResponse } from "next/server"
import { createPutRoute, createDeleteRoute, createApiRoute } from "@/lib/api/api-route-wrapper"
import { updateGroup, deleteGroup, getGroup } from "@/features/admin/chat/server"
import { ApplicationError, NotFoundError } from "@/features/admin/resources/server"
import type { ApiRouteContext } from "@/lib/api/types"

async function updateGroupHandler(req: NextRequest, context: ApiRouteContext, ...args: unknown[]) {
  const userId = context.session?.user?.id

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { params } = args[0] as { params: Promise<{ id: string }> }
  const { id } = await params

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 })
  }

  const name = typeof body.name === "string" ? body.name : undefined
  const description = typeof body.description === "string" ? body.description : undefined
  const avatar = typeof body.avatar === "string" ? body.avatar : null

  try {
    const group = await updateGroup(
      {
        actorId: userId,
        permissions: context.permissions,
        roles: context.roles,
      },
      {
        groupId: id,
        name,
        description,
        avatar,
      }
    )

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
    if (error instanceof ApplicationError) {
      return NextResponse.json({ error: error.message }, { status: error.status || 400 })
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    console.error("Error updating group:", error)
    return NextResponse.json({ error: "Đã xảy ra lỗi khi cập nhật nhóm" }, { status: 500 })
  }
}

async function deleteGroupHandler(req: NextRequest, context: ApiRouteContext, ...args: unknown[]) {
  const userId = context.session?.user?.id

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { params } = args[0] as { params: Promise<{ id: string }> }
  const { id } = await params

  try {
    await deleteGroup(
      {
        actorId: userId,
        permissions: context.permissions,
        roles: context.roles,
      },
      id
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof ApplicationError) {
      return NextResponse.json({ error: error.message }, { status: error.status || 400 })
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    console.error("Error deleting group:", error)
    return NextResponse.json({ error: "Đã xảy ra lỗi khi xóa nhóm" }, { status: 500 })
  }
}

async function getGroupHandler(req: NextRequest, context: ApiRouteContext, ...args: unknown[]) {
  const userId = context.session?.user?.id

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { params } = args[0] as { params: Promise<{ id: string }> }
  const { id } = await params

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
    if (error instanceof ApplicationError) {
      return NextResponse.json({ error: error.message }, { status: error.status || 400 })
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    console.error("Error getting group:", error)
    return NextResponse.json({ error: "Đã xảy ra lỗi khi lấy thông tin nhóm" }, { status: 500 })
  }
}

export const GET = createApiRoute(getGroupHandler)
export const PUT = createPutRoute(updateGroupHandler)
export const DELETE = createDeleteRoute(deleteGroupHandler)

