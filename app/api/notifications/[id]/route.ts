/**
 * API Route cho Notification operations (mark as read, delete)
 */
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import {
  getNotificationCache,
  getSocketServer,
  mapNotificationToPayload,
  removeNotificationFromCache,
  updateNotificationInCache,
} from "@/lib/socket/state"

// PATCH - Mark notification as read/unread
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const { id } = await params

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { isRead } = body

    // Verify notification belongs to user
    const notification = await prisma.notification.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!notification) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      )
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: {
        isRead: isRead ?? !notification.isRead,
        readAt: isRead !== false ? new Date() : null,
      },
    })

    updateNotificationInCache(session.user.id, updated.id, (item) => {
      item.read = updated.isRead
    })

    const io = getSocketServer()
    if (io) {
      const payload = mapNotificationToPayload(updated)
      io.to(`user:${session.user.id}`).emit("notification:updated", payload)
    }

    return NextResponse.json(updated)
  } catch (error) {
    logger.error("Error updating notification", error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: "Failed to update notification" },
      { status: 500 }
    )
  }
}

// DELETE - Xóa notification
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const { id } = await params

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify notification belongs to user
    const notification = await prisma.notification.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!notification) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      )
    }

    await prisma.notification.delete({
      where: { id },
    })

    const removed = removeNotificationFromCache(session.user.id, id)

    const io = getSocketServer()
    if (io && removed) {
      const cache = getNotificationCache()
      const current = cache.get(session.user.id) ?? []
      io.to(`user:${session.user.id}`).emit("notifications:sync", current)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error("Error deleting notification", error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: "Failed to delete notification" },
      { status: 500 }
    )
  }
}
