/**
 * API Route: GET /api/admin/unread-counts
 * Get total unread messages, notifications, and contact requests count for current user
 */

import { NextRequest } from "next/server"
import { prisma } from "@/lib/database"
import { NotificationKind, type Prisma } from "@prisma/client"
import { createGetRoute } from "@/lib/api/api-route-wrapper"
import { createErrorResponse, createSuccessResponse } from "@/lib/config"
import { isSuperAdmin } from "@/lib/permissions"
import { getTotalUnreadMessagesCountCached } from "@/features/admin/chat/server/unread-counts"
import type { ApiRouteContext } from "@/lib/api/types"

async function getUnreadCountsHandler(_req: NextRequest, context: ApiRouteContext) {
  const userId = context.session.user?.id
  const userEmail = context.session.user?.email

  if (!userId) {
    return createErrorResponse("Unauthorized", { status: 401 })
  }

  const roles = context.roles ?? []
  const isSuperAdminUser = isSuperAdmin(roles)
  
  // QUAN TRỌNG: Chỉ superadmin@hub.edu.vn mới đếm tất cả notifications
  // Các user khác (kể cả super admin khác) chỉ đếm notifications của chính họ
  const PROTECTED_SUPER_ADMIN_EMAIL = "superadmin@hub.edu.vn"
  const isProtectedSuperAdmin = userEmail === PROTECTED_SUPER_ADMIN_EMAIL

  // Get unread notifications count
  // Logic mới:
  // - Chỉ superadmin@hub.edu.vn: đếm tất cả SYSTEM notifications + thông báo cá nhân
  // - Các user khác: chỉ đếm thông báo cá nhân (không phải SYSTEM)
  const notificationWhere: Prisma.NotificationWhereInput = {
    OR: isProtectedSuperAdmin
      ? [
          // Chỉ superadmin@hub.edu.vn: tất cả SYSTEM notifications
          { kind: NotificationKind.SYSTEM },
          // + thông báo cá nhân của user
          { userId, kind: { not: NotificationKind.SYSTEM } },
        ]
      : [
          // Các user khác: chỉ thông báo cá nhân (không phải SYSTEM)
          { userId, kind: { not: NotificationKind.SYSTEM } },
        ],
    isRead: false,
  }

  // Get contact requests count (chỉ active, không deleted, và chưa đọc)
  // Lưu ý: contactRequests trong unreadCounts đại diện cho số liên hệ chưa đọc
  const contactRequestsWhere: Prisma.ContactRequestWhereInput = {
    deletedAt: null,
    isRead: false,
  }

  const [unreadNotificationsCount, unreadMessagesCount, contactRequestsCount] = await Promise.all([
    prisma.notification.count({ where: notificationWhere }),
    getTotalUnreadMessagesCountCached(userId),
    prisma.contactRequest.count({ where: contactRequestsWhere }),
  ])

  // Log để debug
  const logger = (await import("@/lib/config/logger")).logger
  logger.debug("GET /api/admin/unread-counts: Returning counts", {
    userId,
    userEmail,
    isSuperAdmin: isSuperAdminUser,
    isProtectedSuperAdmin,
    unreadNotificationsCount,
    unreadMessagesCount,
    contactRequestsCount,
    note: isProtectedSuperAdmin 
      ? "superadmin@hub.edu.vn: đếm tất cả notifications" 
      : "Chỉ đếm notifications của chính user",
  })

  return createSuccessResponse({
    unreadMessages: unreadMessagesCount,
    unreadNotifications: unreadNotificationsCount,
    contactRequests: contactRequestsCount,
  })
}

export const GET = createGetRoute(getUnreadCountsHandler)

