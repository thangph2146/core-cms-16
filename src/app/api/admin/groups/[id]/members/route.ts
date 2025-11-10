import { NextRequest, NextResponse } from "next/server"
import { createPostRoute } from "@/lib/api/api-route-wrapper"
import { addGroupMembers } from "@/features/admin/chat/server"
import { ApplicationError, NotFoundError } from "@/features/admin/resources/server"
import type { ApiRouteContext } from "@/lib/api/types"

async function addGroupMembersHandler(req: NextRequest, context: ApiRouteContext, ...args: unknown[]) {
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

  const memberIds = Array.isArray(body.memberIds) ? body.memberIds.filter((id): id is string => typeof id === "string") : []

  if (memberIds.length === 0) {
    return NextResponse.json({ error: "Phải có ít nhất một thành viên" }, { status: 400 })
  }

  try {
    const result = await addGroupMembers(
      {
        actorId: userId,
        permissions: context.permissions,
        roles: context.roles,
      },
      {
        groupId: id,
        memberIds,
      }
    )

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof ApplicationError) {
      return NextResponse.json({ error: error.message }, { status: error.status || 400 })
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    console.error("Error adding group members:", error)
    return NextResponse.json({ error: "Đã xảy ra lỗi khi thêm thành viên" }, { status: 500 })
  }
}

export const POST = createPostRoute(addGroupMembersHandler)

