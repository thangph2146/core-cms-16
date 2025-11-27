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

export function formatSessionNames(
  sessions: Array<{ userName: string | null; userEmail: string }>,
  maxDisplay: number = 3
): string {
  if (sessions.length === 0) return ""
  
  const names = sessions.slice(0, maxDisplay).map((s) => {
    return s.userName || s.userEmail || "Không xác định"
  })
  
  if (sessions.length <= maxDisplay) {
    return names.join(", ")
  }
  
  const remaining = sessions.length - maxDisplay
  return `${names.join(", ")} và ${remaining} session khác`
}

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
    const actor = await getActorInfo(actorId)

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
        title = "Tạo session"
        description = `${userName}`
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
        title = "Cập nhật session"
        description = `${userName}${changeDescriptions.length > 0 ? `\n${changeDescriptions.join(", ")}` : ""}`
        break
      case "delete":
        title = "Xóa session"
        description = `${userName}`
        break
      case "restore":
        title = "Khôi phục session"
        description = `${userName}`
        break
      case "hard-delete":
        title = "Xóa vĩnh viễn session"
        description = `${userName}`
        break
    }
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
        }
      }

      if (createdNotifications.length > 0) {
        const roleNotification = mapNotificationToPayload(createdNotifications[0])
        io.to("role:super_admin").emit("notification:new", roleNotification)
      }
    }
  } catch (error) {
    resourceLogger.actionFlow({
      resource: "sessions",
      action: "error",
      step: "error",
      metadata: { 
        action: "notify-super-admins", 
        sessionId: session.id,
        error: error instanceof Error ? error.message : "Unknown error",
      },
    })
  }
}

export async function notifySuperAdminsOfBulkSessionAction(
  action: "delete" | "restore" | "hard-delete",
  actorId: string,
  sessions: Array<{ userName: string | null; userEmail: string }>
): Promise<void> {
  if (sessions.length === 0) return

  try {
    const actor = await getActorInfo(actorId)

    const namesText = formatSessionNames(sessions, 3)
    const count = sessions.length

    let title = ""
    let description = ""

    switch (action) {
      case "delete":
        title = `Xóa ${count} session`
        description = namesText || `${count} session`
        break
      case "restore":
        title = `Khôi phục ${count} session`
        description = namesText || `${count} session`
        break
      case "hard-delete":
        title = `Xóa vĩnh viễn ${count} session`
        description = namesText || `${count} session`
        break
    }

    const actionUrl = `/admin/sessions`

    const result = await createNotificationForSuperAdmins(
      title,
      description,
      actionUrl,
      NotificationKind.SYSTEM,
      {
        type: `session_bulk_${action}`,
        actorId,
        actorName: actor?.name || actor?.email,
        actorEmail: actor?.email,
        count,
        sessionNames: sessions.map(s => s.userName || s.userEmail),
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
      resource: "sessions",
      action: "error",
      step: "error",
      metadata: { 
        action: "notify-super-admins-bulk",
        count: sessions.length,
        error: error instanceof Error ? error.message : "Unknown error",
      },
    })
  }
}

