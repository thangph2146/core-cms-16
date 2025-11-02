/**
 * API Route để mark tất cả notifications là đã đọc
 */
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { getNotificationCache, getSocketServer } from "@/lib/socket/state"

export async function POST() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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

    if (result.count > 0) {
      const cache = getNotificationCache()
      const notifications = cache.get(session.user.id)
      if (notifications) {
        notifications.forEach((notification) => {
          notification.read = true
        })
        const io = getSocketServer()
        if (io) {
          io.to(`user:${session.user.id}`).emit("notifications:sync", notifications)
        }
      }
    }

    return NextResponse.json({
      success: true,
      count: result.count,
    })
  } catch (error) {
    logger.error("Error marking all as read", error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: "Failed to mark all as read" },
      { status: 500 }
    )
  }
}
