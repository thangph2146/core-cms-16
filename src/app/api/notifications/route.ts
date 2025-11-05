/**
 * API Route: GET /api/notifications - List user's notifications
 * 
 * Supports:
 * - limit: number of notifications to return (default: 20)
 * - offset: number of notifications to skip (default: 0)
 * - unreadOnly: boolean to filter only unread notifications (default: false)
 */
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/database"
import type { Prisma } from "@prisma/client"

async function getUserNotificationsHandler(req: NextRequest) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const searchParams = req.nextUrl.searchParams
  
  // Parse pagination params (support both offset/limit and page/limit)
  const limitParam = searchParams.get("limit")
  const offsetParam = searchParams.get("offset")
  const unreadOnlyParam = searchParams.get("unreadOnly")

  // Validate and parse limit
  const limit = limitParam ? parseInt(limitParam, 10) : 20
  if (isNaN(limit) || limit < 1 || limit > 100) {
    return NextResponse.json(
      { error: "Limit must be a number between 1 and 100" },
      { status: 400 }
    )
  }

  // Validate and parse offset
  const offset = offsetParam ? parseInt(offsetParam, 10) : 0
  if (isNaN(offset) || offset < 0) {
    return NextResponse.json(
      { error: "Offset must be a non-negative number" },
      { status: 400 }
    )
  }

  // Parse unreadOnly
  const unreadOnly = unreadOnlyParam === "true"

  // Build where clause
  // Không filter theo expiresAt - giữ nguyên thông báo cho đến khi user tự xóa
  const where: Prisma.NotificationWhereInput = {
    userId: session.user.id,
  }

  if (unreadOnly) {
    where.isRead = false
  }

  // Get notifications and counts
  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({
      where: {
        ...where,
        isRead: false,
      },
    }),
  ])

  // Map to response format
  const mappedNotifications = notifications.map((n) => ({
    id: n.id,
    userId: n.userId,
    kind: n.kind,
    title: n.title,
    description: n.description,
    isRead: n.isRead,
    actionUrl: n.actionUrl,
    metadata: n.metadata as Record<string, unknown> | null,
    expiresAt: n.expiresAt,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
    readAt: n.readAt,
  }))

  return NextResponse.json({
    notifications: mappedNotifications,
    total,
    unreadCount,
    hasMore: offset + limit < total,
  })
}

async function deleteAllNotificationsHandler(_req: NextRequest) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Chỉ xóa notification của chính user - không bao giờ xóa notification của người khác
  const result = await prisma.notification.deleteMany({
    where: {
      userId: session.user.id,
    },
  })

  return NextResponse.json({
    success: true,
    count: result.count,
    message: `Đã xóa ${result.count} thông báo thành công.`,
  })
}

export async function GET(req: NextRequest) {
  try {
    return await getUserNotificationsHandler(req)
  } catch (error) {
    console.error("Error fetching notifications:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    return await deleteAllNotificationsHandler(req)
  } catch (error) {
    console.error("Error deleting all notifications:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
