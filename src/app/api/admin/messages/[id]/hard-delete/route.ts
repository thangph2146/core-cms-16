import { NextRequest, NextResponse } from "next/server"
import { createApiRoute } from "@/lib/api/api-route-wrapper"
import { hardDeleteMessage } from "@/features/admin/chat/server"
import { ApplicationError, NotFoundError } from "@/features/admin/resources/server"
import type { ApiRouteContext } from "@/lib/api/types"

async function hardDeleteMessageHandler(req: NextRequest, context: ApiRouteContext, ...args: unknown[]) {
  const userId = context.session?.user?.id

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { params } = args[0] as { params: Promise<{ id: string }> }
  const { id } = await params

  try {
    await hardDeleteMessage(
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
    console.error("Error hard deleting message:", error)
    return NextResponse.json({ error: "Đã xảy ra lỗi khi xóa vĩnh viễn tin nhắn" }, { status: 500 })
  }
}

export const DELETE = createApiRoute(hardDeleteMessageHandler)

