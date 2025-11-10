import { NextRequest, NextResponse } from "next/server"
import { createDeleteRoute } from "@/lib/api/api-route-wrapper"
import { removeGroupMember } from "@/features/admin/chat/server"
import { ApplicationError, NotFoundError } from "@/features/admin/resources/server"
import type { ApiRouteContext } from "@/lib/api/types"

async function removeGroupMemberHandler(req: NextRequest, context: ApiRouteContext, ...args: unknown[]) {
  const userId = context.session?.user?.id

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { params } = args[0] as { params: Promise<{ id: string; userId: string }> }
  const { id: groupId, userId: memberId } = await params

  try {
    await removeGroupMember(
      {
        actorId: userId,
        permissions: context.permissions,
        roles: context.roles,
      },
      {
        groupId,
        memberId,
      }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof ApplicationError) {
      return NextResponse.json({ error: error.message }, { status: error.status || 400 })
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    console.error("Error removing group member:", error)
    return NextResponse.json({ error: "Đã xảy ra lỗi khi xóa thành viên" }, { status: 500 })
  }
}

export const DELETE = createDeleteRoute(removeGroupMemberHandler)

