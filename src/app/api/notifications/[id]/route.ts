/**
 * API Route: 
 * - PATCH /api/notifications/[id] - Update notification (mark as read/unread)
 * - DELETE /api/notifications/[id] - Delete notification (chỉ thông báo cá nhân, không cho phép xóa SYSTEM)
 */
import { NextRequest } from "next/server"
import { auth } from "@/lib/auth/auth"
import { deleteNotification } from "@/features/admin/notifications/server/mutations"
import { prisma } from "@/lib/database"
import { getSocketServer } from "@/lib/socket/state"
import { mapNotificationToPayload } from "@/lib/socket/state"
import { createErrorResponse, createSuccessResponse } from "@/lib/config"

async function patchNotificationHandler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()

  if (!session?.user?.id) {
    return createErrorResponse("Unauthorized", { status: 401 })
  }

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const { isRead } = body

  // Verify notification exists
  const notification = await prisma.notification.findUnique({
    where: { id },
  })

  if (!notification) {
    return createErrorResponse("Notification not found", { status: 404 })
  }

  // Check permissions: user chỉ có thể đánh dấu đã đọc notification của chính mình
  const isOwner = notification.userId === session.user.id
  
  if (!isOwner) {
    return createErrorResponse("Bạn chỉ có thể thao tác thông báo của chính mình.", { status: 403, error: "Forbidden" })
  }

  // Update notification
  const updateData: { isRead: boolean; readAt?: Date | null } = {
    isRead: isRead === true || isRead === "true",
  }

  if (updateData.isRead && !notification.readAt) {
    updateData.readAt = new Date()
  } else if (!updateData.isRead) {
    updateData.readAt = null
  }

  const updated = await prisma.notification.update({
    where: { id },
    data: updateData,
  })

  // Emit socket event để đồng bộ real-time với các clients khác
  const io = getSocketServer()
  if (io && updated.userId) {
    try {
      const payload = mapNotificationToPayload(updated)
      io.to(`user:${updated.userId}`).emit("notification:updated", payload)
    } catch (error) {
      console.warn("Failed to emit socket event for notification update", error)
    }
  }

  return createSuccessResponse({
    id: updated.id,
    userId: updated.userId,
    kind: updated.kind,
    title: updated.title,
    description: updated.description,
    isRead: updated.isRead,
    actionUrl: updated.actionUrl,
    metadata: updated.metadata as Record<string, unknown> | null,
    expiresAt: updated.expiresAt,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
    readAt: updated.readAt,
  })
}

async function deleteNotificationHandler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()

  if (!session?.user?.id) {
    return createErrorResponse("Unauthorized", { status: 401 })
  }

  const { id } = await params

  try {
    await deleteNotification(id, session.user.id)
    return createSuccessResponse({ success: true })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error"
    
    // Handle specific error cases
    if (errorMessage.includes("cannot be deleted")) {
      return createErrorResponse("Thông báo hệ thống không thể xóa", { status: 403 })
    }
    if (errorMessage.includes("Forbidden") || errorMessage.includes("only delete")) {
      return createErrorResponse("Bạn chỉ có thể xóa thông báo của chính mình", { status: 403 })
    }
    if (errorMessage.includes("not found")) {
      return createErrorResponse("Không tìm thấy thông báo", { status: 404 })
    }
    
    console.error("Error deleting notification:", error)
    return createErrorResponse("Internal server error", { status: 500 })
  }
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    return await patchNotificationHandler(req, context)
  } catch (error) {
    console.error("Error updating notification:", error)
    return createErrorResponse("Internal server error", { status: 500 })
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    return await deleteNotificationHandler(req, context)
  } catch (error) {
    console.error("Error deleting notification:", error)
    return createErrorResponse("Internal server error", { status: 500 })
  }
}
