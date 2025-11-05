/**
 * API Route: POST /api/notifications/mark-all-read - Mark all notifications as read
 */
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/database"

async function markAllAsReadHandler(_req: NextRequest) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Update all unread notifications for the user
  const result = await prisma.notification.updateMany({
    where: {
      userId: session.user.id,
      isRead: false,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  })

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

