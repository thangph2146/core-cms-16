import { NextRequest, NextResponse } from "next/server"
import { createPatchRoute } from "@/lib/api/api-route-wrapper"
import { updateGroupMemberRole } from "@/features/admin/chat/server"
import { ApplicationError, NotFoundError } from "@/features/admin/resources/server"
import type { ApiRouteContext } from "@/lib/api/types"

async function updateGroupMemberRoleHandler(req: NextRequest, context: ApiRouteContext, ...args: unknown[]) {
  const userId = context.session?.user?.id

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { params } = args[0] as { params: Promise<{ id: string; userId: string }> }
  const { id: groupId, userId: memberId } = await params

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 })
  }

  const role = typeof body.role === "string" && (body.role === "ADMIN" || body.role === "MEMBER") ? body.role : undefined

  if (!role) {
    return NextResponse.json({ error: "Vai trò không hợp lệ" }, { status: 400 })
  }

  try {
    await updateGroupMemberRole(
      {
        actorId: userId,
        permissions: context.permissions,
        roles: context.roles,
      },
      {
        groupId,
        memberId,
        role,
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
    console.error("Error updating group member role:", error)
    return NextResponse.json({ error: "Đã xảy ra lỗi khi cập nhật vai trò" }, { status: 500 })
  }
}

export const PATCH = createPatchRoute(updateGroupMemberRoleHandler)

