/**
 * API Route: POST /api/admin/groups/[id]/mark-read
 * Mark all unread messages in a group as read
 * 
 * Theo Next.js 16 best practices:
 * - Sử dụng dynamic route [id]
 * - Validate input và return proper error responses
 */

import { NextRequest, NextResponse } from "next/server"
import { createPostRoute } from "@/lib/api/api-route-wrapper"
import { markGroupMessagesAsRead } from "@/features/admin/chat/server/mutations"
import {
  extractParams,
  getUserId,
  createAuthContext,
  handleApiError,
} from "@/lib/api/api-route-helpers"
import type { ApiRouteContext } from "@/lib/api/types"

async function markGroupReadHandler(req: NextRequest, context: ApiRouteContext, ...args: unknown[]) {
  const userId = getUserId(context)
  const { id: groupId } = await extractParams<{ id: string }>(args)

  try {
    const result = await markGroupMessagesAsRead(createAuthContext(context, userId), userId, groupId)
    return NextResponse.json({ count: result.count })
  } catch (error) {
    return handleApiError(error, "Đã xảy ra lỗi", 500)
  }
}

export const POST = createPostRoute(markGroupReadHandler)

