/**
 * API Route: POST /api/notifications/mark-all-read - Mark all notifications as read
 */
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/database"
import { getSocketServer, getNotificationCache, mapNotificationToPayload } from "@/lib/socket/state"

async function markAllAsReadHandler(_req: NextRequest) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Update all unread notifications for the user
  // Không filter theo expiresAt - giữ nguyên thông báo cho đến khi user tự xóa
  const result = await prisma.notification.updateMany({
    where: {
      userId: session.user.id,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  })

  // Emit socket event để đồng bộ real-time
  const io = getSocketServer()
  if (io && result.count > 0) {
    try {
      // Reload notifications từ DB và sync với cache
      const notifications = await prisma.notification.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        take: 50,
      })

      const cache = getNotificationCache()
      const payloads = notifications.map(mapNotificationToPayload)
      cache.set(session.user.id, payloads)

      // Emit sync event để client reload notifications
      io.to(`user:${session.user.id}`).emit("notifications:sync", payloads)
    } catch (error) {
      console.warn("Failed to emit socket event for mark-all-read", error)
    }
  }

  return NextResponse.json({
    success: true,
    count: result.count,
  })
}

export async function POST(req: NextRequest) {
  try {
    return await markAllAsReadHandler(req)
  } catch (error) {
    console.error("Error marking all notifications as read:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

