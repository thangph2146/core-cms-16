import { NextRequest, NextResponse } from "next/server"
import { createApiRoute, createPostRoute } from "@/lib/api/api-route-wrapper"
import { createGroup, listGroups } from "@/features/admin/chat/server"
import { ApplicationError, NotFoundError } from "@/features/admin/resources/server"
import type { ApiRouteContext } from "@/lib/api/types"

async function createGroupHandler(req: NextRequest, context: ApiRouteContext) {
  const userId = context.session?.user?.id

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 })
  }

  const name = typeof body.name === "string" ? body.name : undefined
  const description = typeof body.description === "string" ? body.description : undefined
  const avatar = typeof body.avatar === "string" ? body.avatar : null
  const memberIds = Array.isArray(body.memberIds) ? body.memberIds.filter((id): id is string => typeof id === "string") : []

  if (!name) {
    return NextResponse.json({ error: "Tên nhóm là bắt buộc" }, { status: 400 })
  }

  try {
    const group = await createGroup(
      {
        actorId: userId,
        permissions: context.permissions,
        roles: context.roles,
      },
      {
        name,
        description,
        avatar,
        memberIds,
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
    console.error("Error creating group:", error)
    return NextResponse.json({ error: "Đã xảy ra lỗi khi tạo nhóm" }, { status: 500 })
  }
}

async function listGroupsHandler(req: NextRequest, context: ApiRouteContext) {
  const userId = context.session?.user?.id

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const searchParams = req.nextUrl.searchParams
  const page = parseInt(searchParams.get("page") || "1", 10)
  const limit = parseInt(searchParams.get("limit") || "50", 10)
  const search = searchParams.get("search") || undefined

  try {
    const result = await listGroups({
      userId,
      page,
      limit,
      search,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error listing groups:", error)
    return NextResponse.json({ error: "Đã xảy ra lỗi khi lấy danh sách nhóm" }, { status: 500 })
  }
}

export const POST = createPostRoute(createGroupHandler)
export const GET = createApiRoute(listGroupsHandler)

