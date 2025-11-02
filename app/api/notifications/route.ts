/**
 * API Route cho Notifications
 */
import { NextRequest, NextResponse } from "next/server"
import type { Notification } from "@prisma/client"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import {
  getSocketServer,
  mapNotificationToPayload,
  storeNotificationInCache,
} from "@/lib/socket/state"

function broadcastNotification(notification: Notification) {
  const payload = mapNotificationToPayload(notification)
  storeNotificationInCache(notification.userId, payload)

  const io = getSocketServer()
  if (!io) {
    return
  }

  io.to(`user:${notification.userId}`).emit("notification:new", payload)
}

// GET - Lấy danh sách notifications của user
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "20")
    const offset = parseInt(searchParams.get("offset") || "0")
    const unreadOnly = searchParams.get("unreadOnly") === "true"

    const where: {
      userId: string
      isRead?: boolean
      expiresAt?: { gt: Date } | null
    } = {
      userId: session.user.id,
    }

    if (unreadOnly) {
      where.isRead = false
    }

    // Filter out expired notifications
    where.expiresAt = {
      gt: new Date(),
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        take: limit,
        skip: offset,
      }),
      prisma.notification.count({
        where: {
          userId: session.user.id,
          expiresAt: {
            gt: new Date(),
          },
        },
      }),
      prisma.notification.count({
        where: {
          userId: session.user.id,
          isRead: false,
          expiresAt: {
            gt: new Date(),
          },
        },
      }),
    ])

    return NextResponse.json({
      notifications,
      total,
      unreadCount,
      hasMore: offset + notifications.length < total,
    })
  } catch (error) {
    logger.error("Error fetching notifications", error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    )
  }
}

// POST - Tạo notification mới (admin/system only)
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { userId, kind, title, description, actionUrl, metadata, expiresAt } =
      body

    // Validate required fields
    if (!userId || !kind || !title) {
      return NextResponse.json(
        { error: "userId, kind, và title là bắt buộc" },
        { status: 400 }
      )
    }

    const notification = await prisma.notification.create({
      data: {
        userId,
        kind,
        title,
        description,
        actionUrl,
        metadata: metadata || {},
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    })

    broadcastNotification(notification)

    return NextResponse.json(notification, { status: 201 })
  } catch (error) {
    logger.error("Error creating notification", error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: "Failed to create notification" },
      { status: 500 }
    )
  }
}
