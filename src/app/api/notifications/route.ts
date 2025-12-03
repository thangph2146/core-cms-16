/**
 * API Route: GET /api/notifications - List user's notifications
 * 
 * Supports:
 * - limit: number of notifications to return (default: 20)
 * - offset: number of notifications to skip (default: 0)
 * - unreadOnly: boolean to filter only unread notifications (default: false)
 * 
 * Logic:
 * - Super admin: hiển thị tất cả SYSTEM notifications + thông báo cá nhân
 * - User thường: chỉ hiển thị thông báo cá nhân (không phải SYSTEM)
 */
import { NextRequest } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/database"
import { NotificationKind, type Prisma } from "@prisma/client"
import { createErrorResponse, createSuccessResponse } from "@/lib/config"
import { isSuperAdmin } from "@/lib/permissions"
import { logger } from "@/lib/config/logger"

async function getUserNotificationsHandler(req: NextRequest) {
  const session = await auth()

  if (!session?.user?.id) {
    return createErrorResponse("Unauthorized", { status: 401 })
  }

  const searchParams = req.nextUrl.searchParams
  
  // Parse pagination params (support both offset/limit and page/limit)
  const limitParam = searchParams.get("limit")
  const offsetParam = searchParams.get("offset")
  const unreadOnlyParam = searchParams.get("unreadOnly")

  // Validate and parse limit
  const limit = limitParam ? parseInt(limitParam, 10) : 20
  if (isNaN(limit) || limit < 1 || limit > 100) {
    return createErrorResponse("Limit must be a number between 1 và 100", { status: 400 })
  }

  // Validate and parse offset
  const offset = offsetParam ? parseInt(offsetParam, 10) : 0
  if (isNaN(offset) || offset < 0) {
    return createErrorResponse("Offset must be số không âm", { status: 400 })
  }

  // Parse unreadOnly
  const unreadOnly = unreadOnlyParam === "true"

  // Check if user is super admin
  const roles = (session as typeof session & { roles?: Array<{ name: string }> })?.roles || []
  const isSuperAdminUser = isSuperAdmin(roles)

  // Build where clause
  // Logic giống như admin notifications:
  // - Super admin: tất cả SYSTEM notifications + thông báo cá nhân
  // - User thường: chỉ thông báo cá nhân (không phải SYSTEM)
  const where: Prisma.NotificationWhereInput = {
    OR: isSuperAdminUser
      ? [
          // Super admin: tất cả SYSTEM notifications
          { kind: NotificationKind.SYSTEM },
          // + thông báo cá nhân của user
          { userId: session.user.id, kind: { not: NotificationKind.SYSTEM } },
        ]
      : [
          // User thường: chỉ thông báo cá nhân (không phải SYSTEM)
          { userId: session.user.id, kind: { not: NotificationKind.SYSTEM } },
        ],
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

  // Check for duplicates in response
  const notificationIds = mappedNotifications.map(n => n.id)
  const uniqueIds = new Set(notificationIds)
  const hasDuplicates = notificationIds.length !== uniqueIds.size
  
  if (hasDuplicates) {
    const duplicateIds = notificationIds.filter((id, index) => notificationIds.indexOf(id) !== index)
    logger.warn("GET /api/notifications: Duplicate notifications in response", {
      userId: session.user.id,
      totalCount: notificationIds.length,
      uniqueCount: uniqueIds.size,
      duplicateCount: duplicateIds.length,
      duplicateIds: Array.from(new Set(duplicateIds)),
    })
  }

  logger.debug("GET /api/notifications: Returning notifications", {
    userId: session.user.id,
    isSuperAdmin: isSuperAdminUser,
    limit,
    offset,
    unreadOnly,
    total,
    unreadCount,
    notificationsCount: mappedNotifications.length,
    uniqueCount: uniqueIds.size,
    hasDuplicates,
    notifications: mappedNotifications.map(n => ({
      id: n.id,
      title: n.title,
      isRead: n.isRead,
      actionUrl: n.actionUrl,
    })),
  })

  return createSuccessResponse({
    notifications: mappedNotifications,
    total,
    unreadCount,
    hasMore: offset + limit < total,
  })
}

async function deleteNotificationsHandler(req: NextRequest) {
  const session = await auth()

  if (!session?.user?.id) {
    return createErrorResponse("Unauthorized", { status: 401 })
  }

  let body: { ids?: unknown }
  try {
    body = await req.json()
  } catch {
    return createErrorResponse("Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.", { status: 400 })
  }

  const { ids } = body

  // Validate ids array
  if (!Array.isArray(ids) || ids.length === 0) {
    return createErrorResponse("Danh sách ID thông báo không hợp lệ", { status: 400 })
  }

  if (ids.length > 100) {
    return createErrorResponse("Chỉ có thể xóa tối đa 100 thông báo một lúc", { status: 400 })
  }

  // Validate all IDs are strings
  for (const id of ids) {
    if (typeof id !== "string" || !id.trim()) {
      return createErrorResponse(`ID không hợp lệ: ${id}`, { status: 400 })
    }
  }

  try {
    const { bulkDelete } = await import("@/features/admin/notifications/server/mutations")
    const result = await bulkDelete(ids as string[], session.user.id)
    return createSuccessResponse({ success: true, count: result.count })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error"
    
    // Handle specific error cases
    if (errorMessage.includes("cannot be deleted")) {
      return createErrorResponse("Thông báo hệ thống không thể xóa", { status: 403 })
    }
    if (errorMessage.includes("Forbidden") || errorMessage.includes("only delete")) {
      return createErrorResponse("Bạn chỉ có thể xóa thông báo của chính mình", { status: 403 })
    }
    
    console.error("Error deleting notifications:", error)
    return createErrorResponse("Internal server error", { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    return await getUserNotificationsHandler(req)
  } catch (error) {
    console.error("Error fetching notifications:", error)
    return createErrorResponse("Internal server error", { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    return await deleteNotificationsHandler(req)
  } catch (error) {
    console.error("Error deleting notifications:", error)
    return createErrorResponse("Internal server error", { status: 500 })
  }
}
