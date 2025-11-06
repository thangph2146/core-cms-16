/**
 * Helper functions để emit notifications realtime cho users actions
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
 * Helper function để tạo system notification cho super admin về user actions
 */
export async function notifySuperAdminsOfUserAction(
  action: "create" | "update" | "delete" | "restore" | "hard-delete",
  actorId: string,
  targetUser: { id: string; email: string; name: string | null },
  changes?: {
    email?: { old: string; new: string }
    isActive?: { old: boolean; new: boolean }
    roles?: { old: string[]; new: string[] }
  }
) {
  try {
    console.log("[notifySuperAdmins] Starting notification:", {
      action,
      actorId,
      targetUserId: targetUser.id,
      targetUserEmail: targetUser.email,
      hasChanges: !!changes,
      changesKeys: changes ? Object.keys(changes) : [],
    })

    const actor = await getActorInfo(actorId)
    const actorName = actor?.name || actor?.email || "Hệ thống"
    const targetUserName = targetUser.name || targetUser.email

    let title = ""
    let description = ""
    const actionUrl = `/admin/users/${targetUser.id}`

    switch (action) {
      case "create":
        title = "👤 Người dùng mới được tạo"
        description = `${actorName} đã tạo người dùng mới: ${targetUserName} (${targetUser.email})`
        break
      case "update":
        const changeDescriptions: string[] = []
        if (changes?.email) {
          changeDescriptions.push(`Email: ${changes.email.old} → ${changes.email.new}`)
        }
        if (changes?.isActive !== undefined) {
          changeDescriptions.push(
            `Trạng thái: ${changes.isActive.old ? "Hoạt động" : "Tạm khóa"} → ${changes.isActive.new ? "Hoạt động" : "Tạm khóa"}`
          )
        }
        if (changes?.roles) {
          changeDescriptions.push(
            `Vai trò: ${changes.roles.old.join(", ") || "Không có"} → ${changes.roles.new.join(", ") || "Không có"}`
          )
        }
        title = "✏️ Người dùng được cập nhật"
        description = `${actorName} đã cập nhật người dùng: ${targetUserName} (${targetUser.email})${
          changeDescriptions.length > 0 ? `\nThay đổi: ${changeDescriptions.join(", ")}` : ""
        }`
        break
      case "delete":
        title = "🗑️ Người dùng bị xóa"
        description = `${actorName} đã xóa người dùng: ${targetUserName} (${targetUser.email})`
        break
      case "restore":
        title = "♻️ Người dùng được khôi phục"
        description = `${actorName} đã khôi phục người dùng: ${targetUserName} (${targetUser.email})`
        break
      case "hard-delete":
        title = "⚠️ Người dùng bị xóa vĩnh viễn"
        description = `${actorName} đã xóa vĩnh viễn người dùng: ${targetUserName} (${targetUser.email})`
        break
    }

    // Tạo notifications trong DB cho tất cả super admins
    console.log("[notifySuperAdmins] Creating notifications in DB:", {
      title,
      description,
      actionUrl,
      action,
    })
    const result = await createNotificationForSuperAdmins(
      title,
      description,
      actionUrl,
      NotificationKind.SYSTEM,
      {
        type: `user_${action}`,
        actorId,
        actorName: actor?.name || actor?.email,
        actorEmail: actor?.email,
        targetUserId: targetUser.id,
        targetUserName,
        targetUserEmail: targetUser.email,
        changes,
        timestamp: new Date().toISOString(),
      }
    )
    console.log("[notifySuperAdmins] Notifications created:", {
      count: result.count,
      action,
    })

    // Emit socket event nếu có socket server
    const io = getSocketServer()
    console.log("[notifySuperAdmins] Socket server status:", {
      hasSocketServer: !!io,
      notificationCount: result.count,
    })
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

      console.log("[notifySuperAdmins] Found super admins:", {
        count: superAdmins.length,
        adminIds: superAdmins.map((a) => a.id),
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
          console.log("[notifySuperAdmins] Emitted to user room:", {
            adminId: admin.id,
            room: `user:${admin.id}`,
            notificationId: dbNotification.id,
          })
        } else {
          // Fallback nếu không tìm thấy notification trong database
          const fallbackNotification = {
            id: `user-${action}-${targetUser.id}-${Date.now()}`,
            kind: "system" as const,
            title,
            description,
            actionUrl,
            timestamp: Date.now(),
            read: false,
            toUserId: admin.id,
            metadata: {
              type: `user_${action}`,
              actorId,
              targetUserId: targetUser.id,
            },
          }
          storeNotificationInCache(admin.id, fallbackNotification)
          io.to(`user:${admin.id}`).emit("notification:new", fallbackNotification)
          console.log("[notifySuperAdmins] Emitted fallback notification to user room:", {
            adminId: admin.id,
            room: `user:${admin.id}`,
          })
        }
      }

      // Also emit to role room for broadcast (use first notification if available)
      if (createdNotifications.length > 0) {
        const roleNotification = mapNotificationToPayload(createdNotifications[0])
        io.to("role:super_admin").emit("notification:new", roleNotification)
        console.log("[notifySuperAdmins] Emitted to role room: role:super_admin")
      }
    }
  } catch (error) {
    // Log error nhưng không throw để không ảnh hưởng đến main operation
    console.error("[notifications] Failed to notify super admins of user action:", error)
  }
}

