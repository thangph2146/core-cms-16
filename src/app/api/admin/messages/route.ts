/**
 * API Route: POST /api/admin/messages - Send a new message
 * 
 * Theo Next.js 16 best practices:
 * - Sử dụng createApiRoute wrapper để handle authentication và permissions
 * - Import mutations từ features/admin/chat/server/mutations
 * - Validate input và return proper error responses
 * - Không chứa business logic (logic nằm trong mutations)
 */

import { NextRequest, NextResponse } from "next/server"
import { createPostRoute } from "@/lib/api/api-route-wrapper"
import { createMessage } from "@/features/admin/chat/server/mutations"
import {
  parseRequestBody,
  getUserId,
  createAuthContext,
  handleApiError,
  getStringValue,
} from "@/lib/api/api-route-helpers"
import type { ApiRouteContext } from "@/lib/api/types"

async function sendMessageHandler(req: NextRequest, context: ApiRouteContext) {
  const body = await parseRequestBody(req)
  const userId = getUserId(context)

  const content = getStringValue(body, "content")
  const receiverId = getStringValue(body, "receiverId")
  const groupId = getStringValue(body, "groupId")
  const parentId = typeof body.parentId === "string" ? body.parentId : body.parentId === null ? null : undefined
  const type = getStringValue(body, "type")

  if (!content) {
    return NextResponse.json({ error: "Content là bắt buộc" }, { status: 400 })
  }

  if (!receiverId && !groupId) {
    return NextResponse.json({ error: "receiverId hoặc groupId là bắt buộc" }, { status: 400 })
  }

  try {
    const message = await createMessage(createAuthContext(context, userId), {
      content,
      receiverId: receiverId || null,
      groupId: groupId || null,
      parentId: parentId || null,
      type: (type as "NOTIFICATION" | "ANNOUNCEMENT" | "PERSONAL" | "SYSTEM") || "PERSONAL",
    })

    return NextResponse.json({
      id: message.id,
      content: message.content,
      senderId: message.senderId,
      receiverId: message.receiverId,
      timestamp: message.createdAt.toISOString(),
      parentId: message.parentId,
    })
  } catch (error) {
    return handleApiError(error, "Đã xảy ra lỗi khi gửi tin nhắn", 500)
  }
}

export const POST = createPostRoute(sendMessageHandler)

