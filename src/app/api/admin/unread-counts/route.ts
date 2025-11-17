/**
 * API Route: GET /api/admin/unread-counts
 * Get total unread messages and notifications count for current user
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/database"
import { NotificationKind, type Prisma } from "@prisma/client"
import { createGetRoute } from "@/lib/api/api-route-wrapper"
import { createErrorResponse, createSuccessResponse } from "@/lib/config"
import { isSuperAdmin } from "@/lib/permissions"
import { getTotalUnreadMessagesCountCached } from "@/features/admin/chat/server/unread-counts"
import type { ApiRouteContext } from "@/lib/api/types"

async function getUnreadCountsHandler(_req: NextRequest, context: ApiRouteContext) {
  const userId = context.session.user?.id

  if (!userId) {
    return createErrorResponse("Unauthorized", { status: 401 })
  }

  const roles = context.roles ?? []
  const isSuperAdminUser = isSuperAdmin(roles)

  // Get unread notifications count
  const notificationWhere: Prisma.NotificationWhereInput = {
    OR: isSuperAdminUser
      ? [
          // Super admin: tất cả SYSTEM notifications + thông báo cá nhân
          { kind: NotificationKind.SYSTEM },
          // + thông báo cá nhân của user
          { userId, kind: { not: NotificationKind.SYSTEM } },
        ]
      : [
          // User thường: chỉ thông báo cá nhân (không phải SYSTEM)
          { userId, kind: { not: NotificationKind.SYSTEM } },
        ],
    isRead: false,
  }

  const [unreadNotificationsCount, unreadMessagesCount] = await Promise.all([
    prisma.notification.count({ where: notificationWhere }),
    getTotalUnreadMessagesCountCached(userId),
  ])

  return createSuccessResponse({
    unreadMessages: unreadMessagesCount,
    unreadNotifications: unreadNotificationsCount,
  })
}

export const GET = createGetRoute(getUnreadCountsHandler)

