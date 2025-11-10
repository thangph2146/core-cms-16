/**
 * API Route: PATCH /api/admin/messages/[id] - Mark message as read/unread
 * 
 * Theo Next.js 16 best practices:
 * - Sử dụng dynamic route [id]
 * - Validate input và return proper error responses
 */

import { NextRequest, NextResponse } from "next/server"
import { createApiRoute } from "@/lib/api/api-route-wrapper"
import { markMessageAsRead, markMessageAsUnread } from "@/features/admin/chat/server/mutations"
import { mapMessageRecord } from "@/features/admin/chat/server/helpers"
import { ApplicationError, NotFoundError } from "@/features/admin/resources/server"
import type { ApiRouteContext } from "@/lib/api/types"

async function markMessageHandler(req: NextRequest, context: ApiRouteContext, ...args: unknown[]) {
  const { params } = args[0] as { params: Promise<{ id: string }> }
  const { id: messageId } = await params
  const userId = context.session?.user?.id

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 })
  }

  const isRead = typeof body.isRead === "boolean" ? body.isRead : undefined

  if (isRead === undefined) {
    return NextResponse.json({ error: "isRead is required" }, { status: 400 })
  }

  try {
    const message = isRead
      ? await markMessageAsRead(
          {
            actorId: userId,
            permissions: context.permissions,
            roles: context.roles,
          },
          messageId,
          userId
        )
      : await markMessageAsUnread(
          {
            actorId: userId,
            permissions: context.permissions,
            roles: context.roles,
          },
          messageId,
          userId
        )

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
    if (error instanceof ApplicationError) {
      return NextResponse.json({ error: error.message }, { status: error.status || 400 })
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    console.error("Error marking message:", error)
    return NextResponse.json({ error: "Đã xảy ra lỗi" }, { status: 500 })
  }
}

export const PATCH = createApiRoute(markMessageHandler)

