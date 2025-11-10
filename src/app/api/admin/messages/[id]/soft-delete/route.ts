import { NextRequest, NextResponse } from "next/server"
import { createDeleteRoute } from "@/lib/api/api-route-wrapper"
import { softDeleteMessage } from "@/features/admin/chat/server"
import {
  extractParams,
  getUserId,
  createAuthContext,
  handleApiError,
} from "@/lib/api/api-route-helpers"
import type { ApiRouteContext } from "@/lib/api/types"

async function softDeleteMessageHandler(req: NextRequest, context: ApiRouteContext, ...args: unknown[]) {
  const userId = getUserId(context)
  const { id } = await extractParams<{ id: string }>(args)

  try {
    const message = await softDeleteMessage(createAuthContext(context, userId), id)
    return NextResponse.json({
      id: message.id,
      deletedAt: message.deletedAt?.toISOString() || null,
    })
  } catch (error) {
    return handleApiError(error, "Đã xảy ra lỗi khi xóa tin nhắn", 500)
  }
}

export const DELETE = createDeleteRoute(softDeleteMessageHandler)

