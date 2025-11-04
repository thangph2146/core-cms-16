/**
 * API Route cho Notifications
 */
import { NextRequest, NextResponse } from "next/server"
import type { Notification } from "@prisma/client"
import { prisma } from "@/lib/database"
import { PERMISSIONS } from "@/lib/permissions"
import {
  getSocketServer,
  mapNotificationToPayload,
  storeNotificationInCache,
} from "@/lib/socket/state"
import { createGetRoute, createPostRoute } from "@/lib/api/api-route-wrapper"
import {
  validateInteger,
  validateEnum,
  validateStringLength,
  sanitizeString,
  validateID,
} from "@/lib/api/validation"

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
async function getNotificationsHandler(
  request: NextRequest,
  context: {
    session: Awaited<ReturnType<typeof import("@/lib/auth").requireAuth>>
    permissions: import("@/lib/permissions").Permission[]
    roles: Array<{ name: string }>
  }
) {
  const { searchParams } = new URL(request.url)
  
  // Validate và sanitize limit
  const limitParam = searchParams.get("limit") || "20"
  const limitValidation = validateInteger(limitParam, 1, 100, "Limit")
  if (!limitValidation.valid) {
    return NextResponse.json({ error: limitValidation.error }, { status: 400 })
  }
  const limit = limitValidation.value!

  // Validate và sanitize offset
  const offsetParam = searchParams.get("offset") || "0"
  const offsetValidation = validateInteger(offsetParam, 0, 10000, "Offset")
  if (!offsetValidation.valid) {
    return NextResponse.json({ error: offsetValidation.error }, { status: 400 })
  }
  const offset = offsetValidation.value!

  // Validate unreadOnly
  const unreadOnlyParam = searchParams.get("unreadOnly")
  const unreadOnly = unreadOnlyParam === "true"

  const where: {
    userId: string
    isRead?: boolean
    expiresAt?: { gt: Date } | null
  } = {
    userId: context.session.user.id,
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
        userId: context.session.user.id,
        expiresAt: {
          gt: new Date(),
        },
      },
    }),
    prisma.notification.count({
      where: {
        userId: context.session.user.id,
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
}

// POST - Tạo notification mới (admin/system only)
async function postNotificationsHandler(
  request: NextRequest,
  _context: {
    session: Awaited<ReturnType<typeof import("@/lib/auth").requireAuth>>
    permissions: import("@/lib/permissions").Permission[]
    roles: Array<{ name: string }>
  }
) {
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

  // Validate ID (UUID or CUID)
  const userIdValidation = validateID(userId)
  if (!userIdValidation.valid) {
    return NextResponse.json({ error: userIdValidation.error }, { status: 400 })
  }

  // Validate và sanitize title
  const titleValidation = validateStringLength(title, 1, 200, "Tiêu đề")
  if (!titleValidation.valid) {
    return NextResponse.json({ error: titleValidation.error }, { status: 400 })
  }

  // Validate kind enum
  const validKinds = [
    "MESSAGE",
    "SYSTEM",
    "ANNOUNCEMENT",
    "ALERT",
    "WARNING",
    "SUCCESS",
    "INFO",
  ] as const
  const kindValidation = validateEnum(kind, validKinds, "Loại thông báo")
  if (!kindValidation.valid) {
    return NextResponse.json({ error: kindValidation.error }, { status: 400 })
  }

  // Sanitize strings
  const sanitizedTitle = sanitizeString(title)
  const sanitizedDescription = description ? sanitizeString(description) : null
  const sanitizedActionUrl = actionUrl ? sanitizeString(actionUrl) : null

  // Validate expiresAt if provided
  let expiresAtDate: Date | null = null
  if (expiresAt) {
    expiresAtDate = new Date(expiresAt)
    if (isNaN(expiresAtDate.getTime())) {
      return NextResponse.json(
        { error: "Ngày hết hạn không hợp lệ" },
        { status: 400 }
      )
    }
    // Ensure expiresAt is in the future
    if (expiresAtDate <= new Date()) {
      return NextResponse.json(
        { error: "Ngày hết hạn phải trong tương lai" },
        { status: 400 }
      )
    }
  }

  const notification = await prisma.notification.create({
    data: {
      userId,
      kind: kindValidation.value!,
      title: sanitizedTitle,
      description: sanitizedDescription,
      actionUrl: sanitizedActionUrl,
      metadata: metadata || {},
      expiresAt: expiresAtDate,
    },
  })

  broadcastNotification(notification)

  return NextResponse.json(notification, { status: 201 })
}

export const GET = createGetRoute(getNotificationsHandler, {
  permissions: PERMISSIONS.NOTIFICATIONS_VIEW,
})

export const POST = createPostRoute(postNotificationsHandler, {
  permissions: PERMISSIONS.NOTIFICATIONS_MANAGE,
})
