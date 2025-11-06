/**
 * Helper functions để emit notifications realtime cho contact requests actions
 */

import { prisma } from "@/lib/database"
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
    const actor = await getActorInfo(actorId)
    const actorName = actor?.name || actor?.email || "Hệ thống"

    let title = ""
    let description = ""
    const actionUrl = `/admin/contact-requests/${contactRequest.id}`

    switch (action) {
      case "create":
        title = "Yêu cầu liên hệ mới được tạo"
        description = `${actorName} đã tạo yêu cầu liên hệ "${contactRequest.subject}" từ ${contactRequest.name} (${contactRequest.email})`
        break
      case "update":
        title = "Yêu cầu liên hệ được cập nhật"
        description = `${actorName} đã cập nhật yêu cầu liên hệ "${contactRequest.subject}"`
        if (changes?.status) {
          description += `\nTrạng thái: ${changes.status.old} → ${changes.status.new}`
        }
        if (changes?.priority) {
          description += `\nĐộ ưu tiên: ${changes.priority.old} → ${changes.priority.new}`
        }
        break
      case "assign":
        title = "Yêu cầu liên hệ được giao"
        description = `${actorName} đã giao yêu cầu liên hệ "${contactRequest.subject}"`
        if (changes?.assignedToId) {
          if (changes.assignedToId.new) {
            const assignedUser = await prisma.user.findUnique({
              where: { id: changes.assignedToId.new },
              select: { name: true, email: true },
            })
            description += ` cho ${assignedUser?.name || assignedUser?.email || "người dùng"}`
          } else {
            description += " (đã hủy giao)"
          }
        }
        break
      case "delete":
        title = "Yêu cầu liên hệ bị xóa"
        description = `${actorName} đã xóa yêu cầu liên hệ "${contactRequest.subject}"`
        break
      case "restore":
        title = "Yêu cầu liên hệ được khôi phục"
        description = `${actorName} đã khôi phục yêu cầu liên hệ "${contactRequest.subject}"`
        break
      case "hard-delete":
        title = "Yêu cầu liên hệ bị xóa vĩnh viễn"
        description = `${actorName} đã xóa vĩnh viễn yêu cầu liên hệ "${contactRequest.subject}"`
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
      for (let i = 0; i < superAdmins.length; i++) {
        const admin = superAdmins[i]
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
    // Log error nhưng không throw để không ảnh hưởng đến main operation
    console.error("[notifications] Failed to notify super admins of contact request action:", error)
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
    console.error("[notifications] Failed to notify user of contact request assignment:", error)
  }
}

