import { NextRequest } from "next/server"
import { auth } from "@/lib/auth/auth"
import { createErrorResponse, createSuccessResponse } from "@/lib/config"
import { bulkMarkAsRead, bulkMarkAsUnread } from "@/features/admin/notifications/server/mutations"

const MAX_BULK_NOTIFICATIONS = 100

type BulkNotificationAction = "mark-read" | "mark-unread"

export async function POST(req: NextRequest) {
  const session = await auth()

  if (!session?.user?.id) {
    return createErrorResponse("Unauthorized", { status: 401 })
  }

  let body: { action?: BulkNotificationAction; ids?: unknown }
  try {
    body = await req.json()
  } catch {
    return createErrorResponse("Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.", { status: 400 })
  }

  const { action, ids } = body || {}

  if (!Array.isArray(ids) || ids.length === 0) {
    return createErrorResponse("Danh sách ID thông báo không hợp lệ", { status: 400 })
  }

  if (ids.length > MAX_BULK_NOTIFICATIONS) {
    return createErrorResponse(
      `Chỉ có thể xử lý tối đa ${MAX_BULK_NOTIFICATIONS} thông báo một lần`,
      { status: 400 },
    )
  }

  const sanitizedIds = ids.filter((id): id is string => typeof id === "string" && id.trim().length > 0)

  if (sanitizedIds.length === 0) {
    return createErrorResponse("Danh sách ID thông báo không hợp lệ", { status: 400 })
  }

  if (action !== "mark-read" && action !== "mark-unread") {
    return createErrorResponse("Action không hợp lệ", { status: 400 })
  }

  try {
    const result =
      action === "mark-read"
        ? await bulkMarkAsRead(sanitizedIds, session.user.id)
        : await bulkMarkAsUnread(sanitizedIds, session.user.id)

    return createSuccessResponse({ count: result.count })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"

    if (message.toLowerCase().includes("forbidden")) {
      return createErrorResponse(message, { status: 403 })
    }

    return createErrorResponse("Internal server error", { status: 500 })
  }
}
