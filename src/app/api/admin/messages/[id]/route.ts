/**
 * API Route: PATCH /api/admin/messages/[id] - Mark message as read/unread
 * 
 * Theo Next.js 16 best practices:
 * - Sử dụng dynamic route [id]
 * - Validate input và return proper error responses
 */

import { NextRequest, NextResponse } from "next/server"
import { createPatchRoute } from "@/lib/api/api-route-wrapper"
import { markMessageAsRead, markMessageAsUnread } from "@/features/admin/chat/server/mutations"
import { mapMessageRecord } from "@/features/admin/chat/server/helpers"
import {
  parseRequestBody,
  extractParams,
  getUserId,
  createAuthContext,
  handleApiError,
} from "@/lib/api/api-route-helpers"
import type { ApiRouteContext } from "@/lib/api/types"

async function markMessageHandler(req: NextRequest, context: ApiRouteContext, ...args: unknown[]) {
  const { id: messageId } = await extractParams<{ id: string }>(args)
  const userId = getUserId(context)
  const body = await parseRequestBody(req)

  const isRead = typeof body.isRead === "boolean" ? body.isRead : undefined
  if (isRead === undefined) {
    return NextResponse.json({ error: "isRead is required" }, { status: 400 })
  }

  try {
    const message = isRead
      ? await markMessageAsRead(createAuthContext(context, userId), messageId, userId)
      : await markMessageAsUnread(createAuthContext(context, userId), messageId, userId)

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 })
    }

    // For group messages: map to include readers array
    // For personal messages: return simple response
    if (message.groupId && "reads" in message && Array.isArray(message.reads)) {
      const messageDetail = mapMessageRecord(message as Parameters<typeof mapMessageRecord>[0])
      return NextResponse.json({
        id: messageDetail.id,
        isRead: messageDetail.isRead,
        content: messageDetail.content,
        senderId: messageDetail.senderId,
        receiverId: messageDetail.receiverId,
        groupId: messageDetail.groupId,
        timestamp: messageDetail.timestamp.toISOString(),
        readers: messageDetail.readers, // Include readers array for group messages
      })
    }

    // For personal messages: return simple response
    return NextResponse.json({
      id: message.id,
      isRead: message.isRead,
      content: message.content,
      senderId: message.senderId,
      receiverId: message.receiverId,
      timestamp: message.createdAt.toISOString(),
    })
  } catch (error) {
    return handleApiError(error, "Đã xảy ra lỗi", 500)
  }
}

export const PATCH = createPatchRoute(markMessageHandler)

