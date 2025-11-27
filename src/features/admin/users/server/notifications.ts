import { prisma } from "@/lib/database"
import { resourceLogger } from "@/lib/config"
import { getSocketServer, storeNotificationInCache, mapNotificationToPayload } from "@/lib/socket/state"
import { createNotificationForSuperAdmins } from "@/features/admin/notifications/server/mutations"
import { NotificationKind } from "@prisma/client"

async function getActorInfo(actorId: string) {
  const actor = await prisma.user.findUnique({
    where: { id: actorId },
    select: { id: true, email: true, name: true },
  })
  return actor
}

function formatUserNames(users: Array<{ name: string | null; email: string }>, maxNames = 3): string {
  if (!users || users.length === 0) return ""
  
  const displayNames = users.slice(0, maxNames).map(u => u.name || u.email)
  const remainingCount = users.length > maxNames ? users.length - maxNames : 0
  
  if (remainingCount > 0) {
    return `${displayNames.join(", ")} và ${remainingCount} người dùng khác`
  }
  return displayNames.join(", ")
}

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
    resourceLogger.actionFlow({
      resource: "users",
      action: action === "create" ? "create" : action === "update" ? "update" : action === "delete" ? "delete" : action === "restore" ? "restore" : "hard-delete",
      step: "error",
      metadata: { userId: targetUser.id, error: error instanceof Error ? error.message : String(error) },
    })
  }
}

export async function notifySuperAdminsOfBulkUserAction(
  action: "delete" | "restore" | "hard-delete",
  actorId: string,
  count: number,
  users?: Array<{ name: string | null; email: string }>
) {
  const startTime = Date.now()
  
  resourceLogger.actionFlow({
    resource: "users",
    action: action === "delete" ? "bulk-delete" : action === "restore" ? "bulk-restore" : "bulk-hard-delete",
    step: "start",
    metadata: { count, userCount: users?.length || 0, actorId },
  })

  try {
    const actor = await getActorInfo(actorId)
    const actorName = actor?.name || actor?.email || "Hệ thống"

    let title = ""
    let description = ""

    // Format user names - hiển thị tối đa 3 tên đầu tiên để rút gọn notification
    const namesText = users && users.length > 0 ? formatUserNames(users, 3) : ""

    switch (action) {
      case "delete":
        title = "🗑️ Đã xóa nhiều người dùng"
        description = namesText 
          ? `${actorName} đã xóa ${count} người dùng: ${namesText}`
          : `${actorName} đã xóa ${count} người dùng`
        break
      case "restore":
        title = "♻️ Đã khôi phục nhiều người dùng"
        description = namesText
          ? `${actorName} đã khôi phục ${count} người dùng: ${namesText}`
          : `${actorName} đã khôi phục ${count} người dùng`
        break
      case "hard-delete":
        title = "⚠️ Đã xóa vĩnh viễn nhiều người dùng"
        description = namesText
          ? `${actorName} đã xóa vĩnh viễn ${count} người dùng: ${namesText}`
          : `${actorName} đã xóa vĩnh viễn ${count} người dùng`
        break
    }

    const actionUrl = `/admin/users`

    const result = await createNotificationForSuperAdmins(
      title,
      description,
      actionUrl,
      NotificationKind.SYSTEM,
      {
        type: `user_bulk_${action}`,
        actorId,
        actorName: actor?.name || actor?.email,
        actorEmail: actor?.email,
        count,
        userEmails: users?.map(u => u.email) || [],
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

    resourceLogger.actionFlow({
      resource: "users",
      action: action === "delete" ? "bulk-delete" : action === "restore" ? "bulk-restore" : "bulk-hard-delete",
      step: "success",
      duration: Date.now() - startTime,
      metadata: { count, userCount: users?.length || 0 },
    })
  } catch (error) {
    resourceLogger.actionFlow({
      resource: "users",
      action: action === "delete" ? "bulk-delete" : action === "restore" ? "bulk-restore" : "bulk-hard-delete",
      step: "error",
      metadata: { count, error: error instanceof Error ? error.message : String(error) },
    })
  }
}

