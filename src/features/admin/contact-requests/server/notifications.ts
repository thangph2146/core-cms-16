import { prisma } from "@/lib/database"
import { resourceLogger } from "@/lib/config"
import { getSocketServer, storeNotificationInCache, mapNotificationToPayload } from "@/lib/socket/state"
import { createNotificationForAllAdmins, emitNotificationToAllAdminsAfterCreate } from "@/features/admin/notifications/server/mutations"
import { emitNotificationNewForAllAdmins } from "@/features/admin/notifications/server/events"
import { DEFAULT_ROLES } from "@/lib/permissions"
import { NotificationKind } from "@prisma/client"

async function getActorInfo(actorId: string) {
  const actor = await prisma.user.findUnique({
    where: { id: actorId },
    select: { id: true, email: true, name: true },
  })
  return actor
}

export function formatContactRequestNames(
  contactRequests: Array<{ subject: string; name: string }>,
  maxDisplay: number = 3
): string {
  if (contactRequests.length === 0) return ""
  
  const names = contactRequests.slice(0, maxDisplay).map((cr) => {
    return cr.subject || cr.name || "Không xác định"
  })
  
  if (contactRequests.length <= maxDisplay) {
    return names.join(", ")
  }
  
  const remaining = contactRequests.length - maxDisplay
  return `${names.join(", ")} và ${remaining} yêu cầu khác`
}

export async function notifySuperAdminsOfContactRequestAction(
  action: "create" | "update" | "assign" | "delete" | "restore" | "hard-delete",
  actorId: string,
  contactRequest: { id: string; subject: string; name: string; email: string },
  changes?: {
    status?: { old: string; new: string }
    priority?: { old: string; new: string }
    assignedToId?: { old: string | null; new: string | null }
  }
) {
  try {
    const _actor = await getActorInfo(actorId)

    let title = ""
    let description = ""
    const actionUrl = `/admin/contact-requests/${contactRequest.id}`

    const contactRequestDisplay = contactRequest.subject || contactRequest.name

    switch (action) {
      case "create":
        title = "Tạo yêu cầu liên hệ"
        description = contactRequestDisplay
        break
      case "update":
        const changeDescriptions: string[] = []
        if (changes?.status) {
          changeDescriptions.push(`Trạng thái: ${changes.status.old} → ${changes.status.new}`)
        }
        if (changes?.priority) {
          changeDescriptions.push(`Độ ưu tiên: ${changes.priority.old} → ${changes.priority.new}`)
        }
        title = "Cập nhật yêu cầu liên hệ"
        description = `${contactRequestDisplay}${changeDescriptions.length > 0 ? `\n${changeDescriptions.join(", ")}` : ""}`
        break
      case "assign":
        title = "Giao yêu cầu liên hệ"
        if (changes?.assignedToId?.new) {
          const assignedUser = await prisma.user.findUnique({
            where: { id: changes.assignedToId.new },
            select: { name: true, email: true },
          })
          description = `${contactRequestDisplay} → ${assignedUser?.name || assignedUser?.email || "người dùng"}`
        } else {
          description = `${contactRequestDisplay} (đã hủy giao)`
        }
        break
      case "delete":
        title = "Xóa yêu cầu liên hệ"
        description = contactRequestDisplay
        break
      case "restore":
        title = "Khôi phục yêu cầu liên hệ"
        description = contactRequestDisplay
        break
      case "hard-delete":
        title = "Xóa vĩnh viễn yêu cầu liên hệ"
        description = contactRequestDisplay
        break
    }

    // Tạo notification trong database cho tất cả admin
    const result = await createNotificationForAllAdmins(
      title,
      description,
      actionUrl,
      NotificationKind.SYSTEM,
      {
        type: `contact_request_${action}`,
        actorId,
        contactRequestId: contactRequest.id,
        contactRequestSubject: contactRequest.subject,
        ...(changes && { changes }),
      }
    )

    // Emit socket event nếu có socket server
    if (result.count > 0) {
      await emitNotificationToAllAdminsAfterCreate(
        title,
        description,
        actionUrl,
        NotificationKind.SYSTEM,
        {
          type: `contact_request_${action}`,
          actorId,
          contactRequestId: contactRequest.id,
          contactRequestSubject: contactRequest.subject,
          ...(changes && { changes }),
        }
      )
    }
  } catch (error) {
    resourceLogger.actionFlow({
      resource: "contact-requests",
      action: "error",
      step: "error",
      metadata: { 
        action: "notify-all-admins", 
        contactRequestId: contactRequest.id,
        error: error instanceof Error ? error.message : "Unknown error",
      },
    })
  }
}

export async function notifyUserOfContactRequestAssignment(
  userId: string,
  contactRequest: { id: string; subject: string; name: string; email: string },
  assignedBy: { id: string; name: string | null; email: string }
) {
  try {
    const assignedByName = assignedBy.name || assignedBy.email || "Hệ thống"
    const title = "Yêu cầu liên hệ được giao cho bạn"
    const description = `${assignedByName} đã giao yêu cầu liên hệ "${contactRequest.subject}" từ ${contactRequest.name} (${contactRequest.email}) cho bạn`
    const actionUrl = `/admin/contact-requests/${contactRequest.id}`

    // Tạo notification trong database
    const dbNotification = await prisma.notification.create({
      data: {
        userId,
        title,
        description,
        actionUrl,
        kind: NotificationKind.SYSTEM,
        metadata: {
          type: "contact_request_assigned",
          contactRequestId: contactRequest.id,
          contactRequestSubject: contactRequest.subject,
          assignedById: assignedBy.id,
        },
      },
    })

    // Emit socket event với notification từ database
    const io = getSocketServer()
    if (io) {
      // Map notification từ database sang socket payload format
      const socketNotification = mapNotificationToPayload(dbNotification)
      storeNotificationInCache(userId, socketNotification)
      io.to(`user:${userId}`).emit("notification:new", socketNotification)
    }
  } catch (error) {
    resourceLogger.actionFlow({
      resource: "contact-requests",
      action: "error",
      step: "error",
      metadata: { 
        action: "notify-user-assignment", 
        userId,
        contactRequestId: contactRequest.id,
        error: error instanceof Error ? error.message : "Unknown error",
      },
    })
  }
}

export async function notifySuperAdminsOfBulkContactRequestAction(
  action: "delete" | "restore" | "hard-delete" | "mark-read" | "mark-unread" | "update-status",
  actorId: string,
  contactRequests: Array<{ subject: string; name: string }>,
  status?: "NEW" | "IN_PROGRESS" | "RESOLVED" | "CLOSED"
): Promise<void> {
  if (contactRequests.length === 0) return

  try {
    const actor = await getActorInfo(actorId)

    const namesText = formatContactRequestNames(contactRequests, 3)
    const count = contactRequests.length

    let title = ""
    let description = ""

    switch (action) {
      case "delete":
        title = `Xóa ${count} yêu cầu liên hệ`
        description = namesText || `${count} yêu cầu liên hệ`
        break
      case "restore":
        title = `Khôi phục ${count} yêu cầu liên hệ`
        description = namesText || `${count} yêu cầu liên hệ`
        break
      case "hard-delete":
        title = `Xóa vĩnh viễn ${count} yêu cầu liên hệ`
        description = namesText || `${count} yêu cầu liên hệ`
        break
      case "mark-read":
        title = `Đánh dấu đã đọc ${count} yêu cầu liên hệ`
        description = namesText || `${count} yêu cầu liên hệ`
        break
      case "mark-unread":
        title = `Đánh dấu chưa đọc ${count} yêu cầu liên hệ`
        description = namesText || `${count} yêu cầu liên hệ`
        break
      case "update-status":
        const statusLabels: Record<string, string> = {
          NEW: "Mới",
          IN_PROGRESS: "Đang xử lý",
          RESOLVED: "Đã xử lý",
          CLOSED: "Đã đóng",
        }
        const statusLabel = status ? statusLabels[status] : "Trạng thái"
        title = `Cập nhật trạng thái ${count} yêu cầu liên hệ`
        description = `${statusLabel}: ${namesText || `${count} yêu cầu liên hệ`}`
        break
    }

    const actionUrl = `/admin/contact-requests`

    // Tạo notification trong database cho tất cả admin
    const result = await createNotificationForAllAdmins(
      title,
      description,
      actionUrl,
      NotificationKind.SYSTEM,
      {
        type: `contact_request_bulk_${action}`,
        actorId,
        actorName: actor?.name || actor?.email,
        actorEmail: actor?.email,
        count,
        contactRequestNames: contactRequests.map(cr => cr.subject || cr.name),
        ...(action === "update-status" && status ? { status } : {}),
        timestamp: new Date().toISOString(),
      }
    )

    // Emit socket event nếu có socket server
    if (result.count > 0) {
      await emitNotificationToAllAdminsAfterCreate(
        title,
        description,
        actionUrl,
        NotificationKind.SYSTEM,
        {
          type: `contact_request_bulk_${action}`,
          actorId,
          actorName: actor?.name || actor?.email,
          actorEmail: actor?.email,
          count,
          contactRequestNames: contactRequests.map(cr => cr.subject || cr.name),
          ...(action === "update-status" && status ? { status } : {}),
          timestamp: new Date().toISOString(),
        }
      )
    }
  } catch (error) {
    resourceLogger.actionFlow({
      resource: "contact-requests",
      action: "error",
      step: "error",
      metadata: { 
        action: "notify-all-admins-bulk",
        count: contactRequests.length,
        error: error instanceof Error ? error.message : "Unknown error",
      },
    })
  }
}

