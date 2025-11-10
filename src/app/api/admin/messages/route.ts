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
import { createApiRoute } from "@/lib/api/api-route-wrapper"
import { createMessage } from "@/features/admin/chat/server/mutations"
import { ApplicationError, NotFoundError } from "@/features/admin/resources/server"
import type { ApiRouteContext } from "@/lib/api/types"

async function sendMessageHandler(req: NextRequest, context: ApiRouteContext) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại." }, { status: 400 })
  }

  const content = typeof body.content === "string" ? body.content : undefined
  const receiverId = typeof body.receiverId === "string" ? body.receiverId : undefined
  const groupId = typeof body.groupId === "string" ? body.groupId : undefined
  const parentId = typeof body.parentId === "string" ? body.parentId : body.parentId === null ? null : undefined
  const type = typeof body.type === "string" ? body.type : undefined

  if (!content) {
    return NextResponse.json({ error: "Content là bắt buộc" }, { status: 400 })
  }

  if (!receiverId && !groupId) {
    return NextResponse.json({ error: "receiverId hoặc groupId là bắt buộc" }, { status: 400 })
  }

  if (!context.session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const message = await createMessage(
      {
        actorId: context.session.user.id,
        permissions: context.permissions,
        roles: context.roles,
      },
      {
        content,
        receiverId: receiverId || null,
        groupId: groupId || null,
        parentId: parentId || null,
        type: (type as "NOTIFICATION" | "ANNOUNCEMENT" | "PERSONAL" | "SYSTEM") || "PERSONAL",
      }
    )

    return NextResponse.json({
      id: message.id,
      content: message.content,
      senderId: message.senderId,
      receiverId: message.receiverId,
      timestamp: message.createdAt.toISOString(),
      parentId: message.parentId,
    })
  } catch (error) {
    if (error instanceof ApplicationError) {
      return NextResponse.json({ error: error.message || "Không thể gửi tin nhắn" }, { status: error.status || 400 })
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message || "Không tìm thấy" }, { status: 404 })
    }
    console.error("Error sending message:", error)
    return NextResponse.json({ error: "Đã xảy ra lỗi khi gửi tin nhắn" }, { status: 500 })
  }
}

export const POST = createApiRoute(sendMessageHandler)

