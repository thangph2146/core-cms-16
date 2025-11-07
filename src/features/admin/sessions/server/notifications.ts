/**
 * Helper functions để emit notifications realtime cho sessions actions
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
 * Helper function để tạo system notification cho super admin về session actions
 */
export async function notifySuperAdminsOfSessionAction(
  action: "create" | "update" | "delete" | "restore" | "hard-delete",
  actorId: string,
  session: { id: string; userId: string; accessToken: string },
  changes?: {
    userId?: { old: string; new: string }
    userAgent?: { old: string | null; new: string | null }
    ipAddress?: { old: string | null; new: string | null }
    isActive?: { old: boolean; new: boolean }
    expiresAt?: { old: string; new: string }
  }
) {
  try {
    console.log("[notifySuperAdmins] Starting session notification:", {
      action,
      actorId,
      sessionId: session.id,
      userId: session.userId,
      hasChanges: !!changes,
      changesKeys: changes ? Object.keys(changes) : [],
    })

    const actor = await getActorInfo(actorId)
    const actorName = actor?.name || actor?.email || "Hệ thống"

    // Lấy thông tin user của session
    const sessionUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { name: true, email: true },
    })
    const userName = sessionUser?.name || sessionUser?.email || "Unknown"

    let title = ""
    let description = ""
    const actionUrl = `/admin/sessions/${session.id}`

    switch (action) {
      case "create":
        title = "🔐 Session mới được tạo"
        description = `${actorName} đã tạo session cho người dùng "${userName}"`
        break
      case "update":
        const changeDescriptions: string[] = []
        if (changes?.userId) {
          changeDescriptions.push(`Người dùng: ${changes.userId.old} → ${changes.userId.new}`)
        }
        if (changes?.userAgent) {
          changeDescriptions.push(`User Agent: ${changes.userAgent.old || "trống"} → ${changes.userAgent.new || "trống"}`)
        }
        if (changes?.ipAddress) {
          changeDescriptions.push(`IP Address: ${changes.ipAddress.old || "trống"} → ${changes.ipAddress.new || "trống"}`)
        }
        if (changes?.isActive) {
          changeDescriptions.push(`Trạng thái: ${changes.isActive.old ? "Hoạt động" : "Vô hiệu hóa"} → ${changes.isActive.new ? "Hoạt động" : "Vô hiệu hóa"}`)
        }
        if (changes?.expiresAt) {
          changeDescriptions.push(`Thời gian hết hạn: ${changes.expiresAt.old} → ${changes.expiresAt.new}`)
        }
        title = "✏️ Session được cập nhật"
        description = `${actorName} đã cập nhật session cho người dùng "${userName}"${
          changeDescriptions.length > 0 ? `\nThay đổi: ${changeDescriptions.join(", ")}` : ""
        }`
        break
      case "delete":
        title = "🗑️ Session bị xóa"
        description = `${actorName} đã xóa session cho người dùng "${userName}"`
        break
      case "restore":
        title = "♻️ Session được khôi phục"
        description = `${actorName} đã khôi phục session cho người dùng "${userName}"`
        break
      case "hard-delete":
        title = "⚠️ Session bị xóa vĩnh viễn"
        description = `${actorName} đã xóa vĩnh viễn session cho người dùng "${userName}"`
        break
    }

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
        type: `session_${action}`,
        actorId,
        actorName: actor?.name || actor?.email,
        actorEmail: actor?.email,
        sessionId: session.id,
        userId: session.userId,
        userName: userName,
        ...(changes && { changes }),
        timestamp: new Date().toISOString(),
      }
    )
    console.log("[notifySuperAdmins] Notifications created:", {
      count: result.count,
      action,
    })

    const io = getSocketServer()
    console.log("[notifySuperAdmins] Socket server status:", {
      hasSocketServer: !!io,
      notificationCount: result.count,
    })
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

      console.log("[notifySuperAdmins] Found super admins:", {
        count: superAdmins.length,
        adminIds: superAdmins.map((a) => a.id),
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

      for (let i = 0; i < superAdmins.length; i++) {
        const admin = superAdmins[i]
        const dbNotification = createdNotifications.find((n) => n.userId === admin.id)

        if (dbNotification) {
          const socketNotification = mapNotificationToPayload(dbNotification)
          storeNotificationInCache(admin.id, socketNotification)
          io.to(`user:${admin.id}`).emit("notification:new", socketNotification)
          console.log("[notifySuperAdmins] Emitted to user room:", {
            adminId: admin.id,
            room: `user:${admin.id}`,
            notificationId: dbNotification.id,
          })
        } else {
          const fallbackNotification = {
            id: `session-${action}-${session.id}-${Date.now()}`,
            kind: "system" as const,
            title,
            description,
            actionUrl,
            timestamp: Date.now(),
            read: false,
            toUserId: admin.id,
            metadata: {
              type: `session_${action}`,
              actorId,
              sessionId: session.id,
              userId: session.userId,
              userName: userName,
              ...(changes && { changes }),
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

      if (createdNotifications.length > 0) {
        const roleNotification = mapNotificationToPayload(createdNotifications[0])
        io.to("role:super_admin").emit("notification:new", roleNotification)
        console.log("[notifySuperAdmins] Emitted to role room: role:super_admin")
      }
    }
  } catch (error) {
    console.error("[notifications] Failed to notify super admins of session action:", error)
  }
}

