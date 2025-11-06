/**
 * API Route: GET /api/admin/notifications - List all notifications for super admin
 * 
 * Chỉ super admin mới được phép truy cập route này
 * 
 * Supports:
 * - page: page number (default: 1)
 * - limit: number of notifications per page (default: 10)
 * - search: search term to filter notifications
 */
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { isSuperAdmin } from "@/lib/permissions"
import { listNotificationsCached } from "@/features/admin/notifications/server/queries"

async function getAdminNotificationsHandler(req: NextRequest) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const roles = session?.roles ?? []
  const isSuperAdminUser = isSuperAdmin(roles)
  
  // Nếu không phải super admin, chỉ được xem notifications của chính họ
  const userId = isSuperAdminUser ? undefined : session.user.id

  const searchParams = req.nextUrl.searchParams
  
  // Parse pagination params
  const pageParam = searchParams.get("page")
  const limitParam = searchParams.get("limit")
  const searchParam = searchParams.get("search")

  // Validate and parse page
  const page = pageParam ? parseInt(pageParam, 10) : 1
  if (isNaN(page) || page < 1) {
    return NextResponse.json(
      { error: "Page must be a positive number" },
      { status: 400 }
    )
  }

  // Validate and parse limit
  const limit = limitParam ? parseInt(limitParam, 10) : 10
  if (isNaN(limit) || limit < 1 || limit > 100) {
    return NextResponse.json(
      { error: "Limit must be a number between 1 and 100" },
      { status: 400 }
    )
  }

  // Parse search
  const search = searchParam?.trim() || ""

  try {
    // Sử dụng cached query function để fetch notifications
    // Nếu userId được truyền, chỉ fetch notifications của user đó
    // Nếu không (super admin), fetch tất cả notifications
    const result = await listNotificationsCached(page, limit, search, "", userId)

    return NextResponse.json({
      data: result.data.map((notification) => ({
        id: notification.id,
        userId: notification.userId,
        userEmail: notification.user.email,
        userName: notification.user.name,
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
    console.error("Error fetching admin notifications:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    return await getAdminNotificationsHandler(req)
  } catch (error) {
    console.error("Error in admin notifications route:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

