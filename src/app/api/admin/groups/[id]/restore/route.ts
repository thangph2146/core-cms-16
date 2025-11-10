import { NextRequest, NextResponse } from "next/server"
import { createApiRoute } from "@/lib/api/api-route-wrapper"
import { restoreGroup } from "@/features/admin/chat/server"
import { ApplicationError, NotFoundError } from "@/features/admin/resources/server"
import type { ApiRouteContext } from "@/lib/api/types"

async function restoreGroupHandler(req: NextRequest, context: ApiRouteContext, ...args: unknown[]) {
  const userId = context.session?.user?.id

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { params } = args[0] as { params: Promise<{ id: string }> }
  const { id } = await params

  try {
    const group = await restoreGroup(
      {
        actorId: userId,
        permissions: context.permissions,
        roles: context.roles,
      },
      id
    )

    return NextResponse.json({
      id: group.id,
      name: group.name,
      description: group.description,
      avatar: group.avatar,
      createdById: group.createdById,
      createdAt: group.createdAt.toISOString(),
      updatedAt: group.updatedAt.toISOString(),
      deletedAt: group.deletedAt?.toISOString() || null,
    })
  } catch (error) {
    if (error instanceof ApplicationError) {
      return NextResponse.json({ error: error.message }, { status: error.status || 400 })
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    console.error("Error restoring group:", error)
    return NextResponse.json({ error: "Đã xảy ra lỗi khi khôi phục nhóm" }, { status: 500 })
  }
}

export const POST = createApiRoute(restoreGroupHandler)

