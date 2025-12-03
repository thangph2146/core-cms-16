/**
 * API Route: POST /api/notifications/mark-all-read - Mark all notifications as read
 */
import { NextRequest } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/database"
import { getSocketServer, getNotificationCache, mapNotificationToPayload } from "@/lib/socket/state"
import { createErrorResponse, createSuccessResponse } from "@/lib/config"
import { logger } from "@/lib/config/logger"
import { isSuperAdmin } from "@/lib/permissions"
import { NotificationKind } from "@prisma/client"

async function markAllAsReadHandler(_req: NextRequest) {
  const session = await auth()

  if (!session?.user?.id) {
    return createErrorResponse("Unauthorized", { status: 401 })
  }

  // Check if user is super admin
  const roles = (session as typeof session & { roles?: Array<{ name: string }> })?.roles || []
  const isSuperAdminUser = isSuperAdmin(roles)

  logger.info("POST /api/notifications/mark-all-read: Processing request", {
    userId: session.user.id,
    isSuperAdmin: isSuperAdminUser,
  })

  // Build where clause
  // IMPORTANT: Super admin chỉ có thể thao tác với notifications của chính mình
  // - Super admin: chỉ mark SYSTEM notifications của chính mình + personal notifications
  // - Regular user: chỉ mark personal notifications
  // Super admin có thể XEM tất cả SYSTEM notifications nhưng chỉ THAO TÁC với của chính mình
  let where: {
    isRead: boolean
    userId?: string
    OR?: Array<{ userId: string; kind: NotificationKind } | { userId: string; kind: { not: NotificationKind } }>
    kind?: { not: NotificationKind }
  }

  if (isSuperAdminUser) {
    // Super admin: mark SYSTEM notifications của chính mình + personal notifications
    // Không mark SYSTEM notifications của user khác
    where = {
      isRead: false,
      OR: [
        { userId: session.user.id, kind: NotificationKind.SYSTEM },
        { userId: session.user.id, kind: { not: NotificationKind.SYSTEM } },
      ],
    }
  } else {
    // Regular user: chỉ mark personal notifications (không phải SYSTEM)
    where = {
      isRead: false,
      userId: session.user.id,
      kind: { not: NotificationKind.SYSTEM },
    }
  }

  logger.debug("POST /api/notifications/mark-all-read: Where clause", {
    userId: session.user.id,
    isSuperAdmin: isSuperAdminUser,
    where,
    note: "Super admin chỉ có thể mark notifications của chính mình, không thể mark của user khác",
  })

  // Check how many notifications match before update (for logging)
  const beforeCount = await prisma.notification.count({ where })
  
  logger.debug("POST /api/notifications/mark-all-read: Before update", {
    userId: session.user.id,
    isSuperAdmin: isSuperAdminUser,
    matchingCount: beforeCount,
  })

  // Update all unread notifications matching the where clause
  // Không filter theo expiresAt - giữ nguyên thông báo cho đến khi user tự xóa
  const result = await prisma.notification.updateMany({
    where,
    data: {
      isRead: true,
      readAt: new Date(),
    },
  })
  
  logger.success("POST /api/notifications/mark-all-read: Marked all as read", {
    userId: session.user.id,
    isSuperAdmin: isSuperAdminUser,
    matchingCount: beforeCount,
    updatedCount: result.count,
    note: "Super admin chỉ mark notifications của chính mình, không mark của user khác",
  })

  // Emit socket event để đồng bộ real-time
  const io = getSocketServer()
  if (io && result.count > 0) {
    try {
      // Reload notifications từ DB với cùng where clause như khi fetch
      // Super admin: tất cả SYSTEM notifications + personal notifications
      // Regular user: chỉ personal notifications
      const fetchWhere: {
        OR?: Array<{ kind: NotificationKind } | { userId: string; kind: { not: NotificationKind } }>
        userId?: string
        kind?: { not: NotificationKind }
      } = isSuperAdminUser
        ? {
            OR: [
              { kind: NotificationKind.SYSTEM },
              { userId: session.user.id, kind: { not: NotificationKind.SYSTEM } },
            ],
          }
        : {
            userId: session.user.id,
            kind: { not: NotificationKind.SYSTEM },
          }

      const notifications = await prisma.notification.findMany({
        where: fetchWhere,
        orderBy: { createdAt: "desc" },
        take: 50,
      })

      const cache = getNotificationCache()
      const payloads = notifications.map(mapNotificationToPayload)
      cache.set(session.user.id, payloads)

      logger.debug("POST /api/notifications/mark-all-read: Emitting sync event", {
        userId: session.user.id,
        notificationsCount: payloads.length,
      })

      // Emit sync event để client reload notifications
      io.to(`user:${session.user.id}`).emit("notifications:sync", payloads)
    } catch (error) {
      logger.error("POST /api/notifications/mark-all-read: Failed to emit socket event", error)
    }
  }

  return createSuccessResponse({ count: result.count })
}

export async function POST(req: NextRequest) {
  try {
    return await markAllAsReadHandler(req)
  } catch (error) {
    console.error("Error marking all notifications as read:", error)
    return createErrorResponse("Internal server error", { status: 500 })
  }
}
