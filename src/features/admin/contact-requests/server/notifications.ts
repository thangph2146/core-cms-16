/**
 * Helper functions để emit notifications realtime cho contact requests actions
 */

import { prisma } from "@/lib/database"
import { resourceLogger } from "@/lib/config"
import { getSocketServer, storeNotificationInCache, mapNotificationToPayload } from "@/lib/socket/state"
import { createNotificationForSuperAdmins } from "@/features/admin/notifications/server/mutations"
import { NotificationKind } from "@prisma/client"

/**
 * Helper function để lấy thông tin actor (người thực hiện action)
 */
async function getActorInfo(actorId: string) {
  const actor = await prisma.user.findUnique({
    where: { id: actorId },
    select: { id: true, email: true, name: true },
  })
  return actor
}

/**
 * Format contact request names cho bulk notifications
 * Rút gọn: chỉ hiển thị subject hoặc name
 */
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

/**
 * Helper function để tạo system notification cho super admin về contact request actions
 */
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

    // Tạo notification trong database
    const result = await createNotificationForSuperAdmins(
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
    const io = getSocketServer()
    if (io && result.count > 0) {
      // Lấy danh sách super admins để emit đến từng user room
      const superAdmins = await prisma.user.findMany({
        where: {
          isActive: true,
          deletedAt: null,
          userRoles: {
            some: {
              role: {
                name: "super_admin",
                isActive: true,
                deletedAt: null,
              },
            },
          },
        },
        select: { id: true },
      })

      // Fetch notifications vừa tạo từ database để lấy IDs thực tế
      const createdNotifications = await prisma.notification.findMany({
        where: {
          title,
          description,
          actionUrl,
          kind: NotificationKind.SYSTEM,
          userId: {
            in: superAdmins.map((a) => a.id),
          },
          createdAt: {
            gte: new Date(Date.now() - 5000), // Created within last 5 seconds
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: superAdmins.length,
      })

      // Emit to each super admin user room với notification từ database
      for (const admin of superAdmins) {
        const dbNotification = createdNotifications.find((n) => n.userId === admin.id)
        
        if (dbNotification) {
          // Map notification từ database sang socket payload format
          const socketNotification = mapNotificationToPayload(dbNotification)
          storeNotificationInCache(admin.id, socketNotification)
          io.to(`user:${admin.id}`).emit("notification:new", socketNotification)
        } else {
          // Fallback nếu không tìm thấy notification trong database
          const fallbackNotification = {
            id: `contact-request-${action}-${contactRequest.id}-${Date.now()}`,
            kind: "system" as const,
            title,
            description,
            actionUrl,
            timestamp: Date.now(),
            read: false,
            toUserId: admin.id,
            metadata: {
              type: `contact_request_${action}`,
              actorId,
              contactRequestId: contactRequest.id,
              contactRequestSubject: contactRequest.subject,
              ...(changes && { changes }),
            },
          }
          storeNotificationInCache(admin.id, fallbackNotification)
          io.to(`user:${admin.id}`).emit("notification:new", fallbackNotification)
        }
      }

      // Also emit to role room for broadcast (use first notification if available)
      if (createdNotifications.length > 0) {
        const roleNotification = mapNotificationToPayload(createdNotifications[0])
        io.to("role:super_admin").emit("notification:new", roleNotification)
      }
    }
  } catch (error) {
    resourceLogger.actionFlow({
      resource: "contact-requests",
      action: "error",
      step: "error",
      metadata: { 
        action: "notify-super-admins", 
        contactRequestId: contactRequest.id,
        error: error instanceof Error ? error.message : "Unknown error",
      },
    })
  }
}

/**
 * Helper function để notify user khi contact request được assign cho họ
 */
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

/**
 * Bulk notification cho bulk operations - emit một notification tổng hợp thay vì từng cái một
 * Để tránh timeout khi xử lý nhiều contact requests
 */
export async function notifySuperAdminsOfBulkContactRequestAction(
  action: "delete" | "restore" | "hard-delete",
  actorId: string,
  contactRequests: Array<{ subject: string; name: string }>
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
    }

    const actionUrl = `/admin/contact-requests`

    const result = await createNotificationForSuperAdmins(
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
        timestamp: new Date().toISOString(),
      }
    )

    const io = getSocketServer()
    if (io && result.count > 0) {
      const superAdmins = await prisma.user.findMany({
        where: {
          isActive: true,
          deletedAt: null,
          userRoles: {
            some: {
              role: {
                name: "super_admin",
                isActive: true,
                deletedAt: null,
              },
            },
          },
        },
        select: { id: true },
      })

      const createdNotifications = await prisma.notification.findMany({
        where: {
          title,
          description,
          actionUrl,
          kind: NotificationKind.SYSTEM,
          userId: {
            in: superAdmins.map((a) => a.id),
          },
          createdAt: {
            gte: new Date(Date.now() - 5000),
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: superAdmins.length,
      })

      for (const admin of superAdmins) {
        const dbNotification = createdNotifications.find((n) => n.userId === admin.id)
        if (dbNotification) {
          const socketNotification = mapNotificationToPayload(dbNotification)
          storeNotificationInCache(admin.id, socketNotification)
          io.to(`user:${admin.id}`).emit("notification:new", socketNotification)
        }
      }

      if (createdNotifications.length > 0) {
        const roleNotification = mapNotificationToPayload(createdNotifications[0])
        io.to("role:super_admin").emit("notification:new", roleNotification)
      }
    }
  } catch (error) {
    resourceLogger.actionFlow({
      resource: "contact-requests",
      action: "error",
      step: "error",
      metadata: { 
        action: "notify-super-admins-bulk",
        count: contactRequests.length,
        error: error instanceof Error ? error.message : "Unknown error",
      },
    })
  }
}

