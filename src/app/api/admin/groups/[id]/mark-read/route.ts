/**
 * API Route: POST /api/admin/groups/[id]/mark-read
 * Mark all unread messages in a group as read
 * 
 * Theo Next.js 16 best practices:
 * - Sử dụng dynamic route [id]
 * - Validate input và return proper error responses
 */

import { NextRequest, NextResponse } from "next/server"
import { createApiRoute } from "@/lib/api/api-route-wrapper"
import { markGroupMessagesAsRead } from "@/features/admin/chat/server/mutations"
import { ApplicationError } from "@/features/admin/resources/server"
import type { ApiRouteContext } from "@/lib/api/types"

async function markGroupReadHandler(req: NextRequest, context: ApiRouteContext, ...args: unknown[]) {
  const { params } = args[0] as { params: Promise<{ id: string }> }
  const { id: groupId } = await params
  const userId = context.session?.user?.id

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await markGroupMessagesAsRead(
      {
        actorId: userId,
        permissions: context.permissions,
        roles: context.roles,
      },
      userId,
      groupId
    )

    return NextResponse.json({ count: result.count })
  } catch (error) {
    if (error instanceof ApplicationError) {
      return NextResponse.json({ error: error.message }, { status: error.status || 400 })
    }
    console.error("Error marking group messages as read:", error)
    return NextResponse.json({ error: "Đã xảy ra lỗi" }, { status: 500 })
  }
}

export const POST = createApiRoute(markGroupReadHandler)

