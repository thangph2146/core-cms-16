/**
 * API Route: GET /api/admin/notifications - List all notifications for super admin
 * 
 * Chỉ super admin mới được phép truy cập route này
 * 
 * Supports:
 * - page: page number (default: 1)
 * - limit: number of notifications per page (default: 10)
 * - search: search term to filter notifications
 * - filter[column]: column filters (userEmail, kind, isRead)
 */
import { NextRequest } from "next/server"
import { auth } from "@/lib/auth/auth"
import { isSuperAdmin } from "@/lib/permissions"
import { listNotifications } from "@/features/admin/notifications/server/queries"
import { createErrorResponse, createSuccessResponse } from "@/lib/config"
import { sanitizeSearchQuery } from "@/lib/api/validation"
import { logger } from "@/lib/config/logger"

async function getAdminNotificationsHandler(req: NextRequest) {
  const session = await auth()

  if (!session?.user?.id) {
    return createErrorResponse("Unauthorized", { status: 401 })
  }

  const roles = session?.roles ?? []
  const isSuperAdminUser = isSuperAdmin(roles)
  
  // Luôn truyền userId để chỉ hiển thị thông báo cá nhân của user đang đăng nhập
  // Thông báo hệ thống (SYSTEM) chỉ được hiển thị cho super admin
  const userId = session.user.id

  const searchParams = req.nextUrl.searchParams
  
  // Parse pagination params
  const pageParam = searchParams.get("page")
  const limitParam = searchParams.get("limit")
  const searchParam = searchParams.get("search")

  // Validate and parse page
  const page = pageParam ? parseInt(pageParam, 10) : 1
  if (isNaN(page) || page < 1) {
    return createErrorResponse("Page must be a positive number", { status: 400 })
  }

  // Validate and parse limit
  const limit = limitParam ? parseInt(limitParam, 10) : 10
  if (isNaN(limit) || limit < 1 || limit > 100) {
    return createErrorResponse("Limit must be a number between 1 and 100", { status: 400 })
  }

  // Parse and sanitize search
  const searchValidation = sanitizeSearchQuery(searchParam || "", 200)
  if (!searchValidation.valid) {
    return createErrorResponse(searchValidation.error || "Invalid search query", { status: 400 })
  }

  // Parse column filters
  const columnFilters: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    if (key.startsWith("filter[")) {
      const columnKey = key.replace("filter[", "").replace("]", "")
      const sanitizedValue = sanitizeSearchQuery(value, 100)
      if (sanitizedValue.valid && sanitizedValue.value) {
        columnFilters[columnKey] = sanitizedValue.value
      }
    }
  })

  try {
    // Sử dụng non-cached query function để fetch notifications (theo chuẩn admin - không cache)
    // Nếu userId được truyền, chỉ fetch notifications của user đó
    // Nếu không (super admin), fetch tất cả notifications
    logger.debug("Fetching admin notifications", {
      page,
      limit,
      search: searchValidation.value || undefined,
      filters: Object.keys(columnFilters).length > 0 ? columnFilters : undefined,
      userId,
      isSuperAdmin: isSuperAdminUser,
    })

    const result = await listNotifications({
      page,
      limit,
      search: searchValidation.value || undefined,
      filters: Object.keys(columnFilters).length > 0 ? columnFilters : undefined,
      userId,
      isSuperAdmin: isSuperAdminUser,
    })

    // Log kết quả
    logger.info("Admin notifications fetched successfully", {
      totalNotifications: result.data.length,
      pagination: result.pagination,
      notifications: result.data.map((n) => ({
        id: n.id,
        userId: n.userId,
        userEmail: n.user?.email || "",
        kind: n.kind,
        title: n.title,
        isRead: n.isRead,
      })),
      kindDistribution: result.data.reduce((acc, n) => {
        acc[n.kind] = (acc[n.kind] || 0) + 1
        return acc
      }, {} as Record<string, number>),
    })

    return createSuccessResponse({
      data: result.data.map((notification) => ({
        id: notification.id,
        userId: notification.userId,
        userEmail: notification.user?.email || "",
        userName: notification.user?.name || null,
        kind: notification.kind,
        title: notification.title,
        description: notification.description,
        isRead: notification.isRead,
        actionUrl: notification.actionUrl,
        createdAt: notification.createdAt.toISOString(),
        readAt: notification.readAt ? notification.readAt.toISOString() : null,
        expiresAt: notification.expiresAt ? notification.expiresAt.toISOString() : null,
      })),
      pagination: result.pagination,
    })
  } catch (error) {
    logger.error("Error fetching admin notifications", error instanceof Error ? error : new Error(String(error)))
    return createErrorResponse("Internal server error", { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    return await getAdminNotificationsHandler(req)
  } catch (error) {
    console.error("Error in admin notifications route:", error)
    return createErrorResponse("Internal server error", { status: 500 })
  }
}
