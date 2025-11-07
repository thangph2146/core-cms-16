/**
 * Server mutations for notifications
 */
import { prisma } from "@/lib/database"
import { NotificationKind, Prisma } from "@prisma/client"
import { DEFAULT_ROLES } from "@/lib/permissions"
import { getSocketServer, storeNotificationInCache, mapNotificationToPayload } from "@/lib/socket/state"

/**
 * Create notification for a specific user
 * Không cần check permission - dùng cho system notifications
 */
export async function createNotificationForUser(
  userId: string,
  title: string,
  description?: string | null,
  actionUrl?: string | null,
  kind: NotificationKind = NotificationKind.SYSTEM,
  metadata?: Record<string, unknown> | null
) {
  // Kiểm tra user có tồn tại và active
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, isActive: true, deletedAt: true },
  })

  if (!user || !user.isActive || user.deletedAt) {
    console.warn("[notifications] User not found or inactive:", userId)
    return null
  }

  // Tạo notification cho user (không cần check permission)
  const notification = await prisma.notification.create({
    data: {
      userId,
      title,
      description: description ?? null,
      actionUrl: actionUrl ?? null,
      kind,
      metadata: metadata ? (metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
      isRead: false,
    },
  })

  console.log("[notifications] Created notification for user:", {
    notificationId: notification.id,
    userId,
    email: user.email,
    title,
  })

  return notification
}

/**
 * Create notification for all super admins
 * Used for system-wide notifications that only super admins should see
 */
export async function createNotificationForSuperAdmins(
  title: string,
  description?: string | null,
  actionUrl?: string | null,
  kind: NotificationKind = NotificationKind.SYSTEM,
  metadata?: Record<string, unknown> | null
) {
  // Find all super admin users
  const superAdmins = await prisma.user.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      userRoles: {
        some: {
          role: {
            name: DEFAULT_ROLES.SUPER_ADMIN.name,
            isActive: true,
            deletedAt: null,
          },
        },
      },
    },
    select: { id: true, email: true },
  })

  console.log("[notifications] Found super admins:", {
    count: superAdmins.length,
    adminIds: superAdmins.map((a) => a.id),
    adminEmails: superAdmins.map((a) => a.email),
  })

  if (superAdmins.length === 0) {
    console.warn("[notifications] No super admin found to receive notification")
    return { count: 0 }
  }

  // Create notifications for all super admins
  const notifications = await prisma.notification.createMany({
    data: superAdmins.map((admin) => ({
      userId: admin.id,
      title,
      description: description ?? null,
      actionUrl: actionUrl ?? null,
      kind,
      metadata: metadata ? (metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
      isRead: false,
    })),
  })

  console.log("[notifications] Created notifications:", {
    count: notifications.count,
    title,
    adminCount: superAdmins.length,
  })

  return { count: notifications.count }
}

/**
 * Emit socket notification to super admins after creating notifications in database
 * Helper function để emit realtime notification sau khi đã tạo notification trong DB
 */
export async function emitNotificationToSuperAdminsAfterCreate(
  title: string,
  description?: string | null,
  actionUrl?: string | null,
  kind: NotificationKind = NotificationKind.SYSTEM,
  metadata?: Record<string, unknown> | null
) {
  try {
    const io = getSocketServer()
    if (!io) {
      console.warn("[notifications] Socket server not available, skipping emit")
      return
    }

    // Find all super admin users
    const superAdmins = await prisma.user.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        userRoles: {
          some: {
            role: {
              name: DEFAULT_ROLES.SUPER_ADMIN.name,
              isActive: true,
              deletedAt: null,
            },
          },
        },
      },
      select: { id: true },
    })

    if (superAdmins.length === 0) {
      console.warn("[notifications] No super admin found to emit notification")
      return
    }

    // Fetch notifications vừa tạo từ database (trong vòng 5 giây)
    const createdNotifications = await prisma.notification.findMany({
      where: {
        title,
        description: description ?? null,
        actionUrl: actionUrl ?? null,
        kind,
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

    console.log("[notifications] Emitting socket notifications:", {
      superAdminCount: superAdmins.length,
      notificationCount: createdNotifications.length,
      title,
    })

    // Emit to each super admin user room với notification từ database
    for (const admin of superAdmins) {
      const dbNotification = createdNotifications.find((n) => n.userId === admin.id)

      if (dbNotification) {
        // Map notification từ database sang socket payload format
        const socketNotification = mapNotificationToPayload(dbNotification)
        storeNotificationInCache(admin.id, socketNotification)
        io.to(`user:${admin.id}`).emit("notification:new", socketNotification)
        console.log("[notifications] Emitted to user room:", {
          adminId: admin.id,
          room: `user:${admin.id}`,
          notificationId: dbNotification.id,
        })
      } else {
        // Fallback nếu không tìm thấy notification trong database
        const fallbackNotification = {
          id: `notification-${Date.now()}-${admin.id}`,
          kind: kind.toLowerCase() as "system" | "message" | "announcement" | "alert" | "warning" | "success" | "info",
          title,
          description: description ?? null,
          actionUrl: actionUrl ?? null,
          timestamp: Date.now(),
          read: false,
          toUserId: admin.id,
          metadata: metadata ?? null,
        }
        storeNotificationInCache(admin.id, fallbackNotification)
        io.to(`user:${admin.id}`).emit("notification:new", fallbackNotification)
        console.log("[notifications] Emitted fallback notification to user room:", {
          adminId: admin.id,
          room: `user:${admin.id}`,
        })
      }
    }

    // Also emit to role room for broadcast (use first notification if available)
    if (createdNotifications.length > 0) {
      const roleNotification = mapNotificationToPayload(createdNotifications[0])
      io.to("role:super_admin").emit("notification:new", roleNotification)
      console.log("[notifications] Emitted to role room: role:super_admin")
    }
  } catch (error) {
    // Log error nhưng không throw để không ảnh hưởng đến main operation
    console.error("[notifications] Failed to emit notification to super admins:", error)
  }
}

export async function markNotificationAsRead(notificationId: string) {
  return await prisma.notification.update({
    where: { id: notificationId },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  })
}

export async function markNotificationAsUnread(notificationId: string) {
  return await prisma.notification.update({
    where: { id: notificationId },
    data: {
      isRead: false,
      readAt: null,
    },
  })
}

export async function deleteNotification(notificationId: string) {
  return await prisma.notification.delete({
    where: { id: notificationId },
  })
}

export async function bulkMarkAsRead(notificationIds: string[]) {
  const result = await prisma.notification.updateMany({
    where: { id: { in: notificationIds } },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  })
  return { count: result.count }
}

export async function bulkDelete(notificationIds: string[]) {
  const result = await prisma.notification.deleteMany({
    where: { id: { in: notificationIds } },
  })
  return { count: result.count }
}
