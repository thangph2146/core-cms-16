/**
 * Server mutations for notifications
 * 
 * Best Practices:
 * - Chỉ user sở hữu notification mới có thể đánh dấu đã đọc/xóa
 * - Tất cả operations đều có permission checks
 * - Emit socket events sau khi tạo/cập nhật notification
 * - Structured logging cho debugging và monitoring
 */
import { prisma } from "@/lib/database"
import { NotificationKind, Prisma } from "@prisma/client"
import { DEFAULT_ROLES } from "@/lib/permissions"
import { getSocketServer, storeNotificationInCache, mapNotificationToPayload } from "@/lib/socket/state"
import { logger } from "@/lib/config"

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
    logger.warn("User not found or inactive for notification creation", { userId })
    return null
  }

  // Validate input
  if (!title || title.trim().length === 0) {
    logger.warn("Invalid notification title", { userId, title })
    return null
  }

  // Tạo notification cho user (không cần check permission - dùng cho system notifications)
  const notification = await prisma.notification.create({
    data: {
      userId,
      title: title.trim(),
      description: description?.trim() ?? null,
      actionUrl: actionUrl?.trim() ?? null,
      kind,
      metadata: metadata ? (metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
      isRead: false,
    },
  })

  logger.info("Notification created for user", {
    notificationId: notification.id,
    userId,
    email: user.email,
    title: notification.title,
    kind: notification.kind,
  })

  // Emit socket event nếu có socket server
  const io = getSocketServer()
  if (io) {
    try {
      const socketNotification = mapNotificationToPayload(notification)
      storeNotificationInCache(userId, socketNotification)
      io.to(`user:${userId}`).emit("notification:new", socketNotification)
      logger.debug("Socket notification emitted for user", {
        notificationId: notification.id,
        userId,
      })
    } catch (error) {
      logger.error("Failed to emit socket notification", error instanceof Error ? error : new Error(String(error)))
    }
  }

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

  // Validate input
  if (!title || title.trim().length === 0) {
    logger.warn("Invalid notification title for super admins", { title })
    return { count: 0 }
  }

  logger.info("Found super admins for notification", {
    count: superAdmins.length,
    adminIds: superAdmins.map((a) => a.id),
    adminEmails: superAdmins.map((a) => a.email),
  })

  if (superAdmins.length === 0) {
    logger.warn("No super admin found to receive notification")
    return { count: 0 }
  }

  // Create notifications for all super admins
  const notifications = await prisma.notification.createMany({
    data: superAdmins.map((admin) => ({
      userId: admin.id,
      title: title.trim(),
      description: description?.trim() ?? null,
      actionUrl: actionUrl?.trim() ?? null,
      kind,
      metadata: metadata ? (metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
      isRead: false,
    })),
  })

  logger.info("Notifications created for super admins", {
    count: notifications.count,
    title: title.trim(),
    adminCount: superAdmins.length,
    kind,
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
      logger.warn("Socket server not available, skipping emit")
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
      logger.warn("No super admin found to emit notification")
      return
    }

    // Fetch notifications vừa tạo từ database (trong vòng 5 giây)
    const createdNotifications = await prisma.notification.findMany({
      where: {
        title: title.trim(),
        description: description?.trim() ?? null,
        actionUrl: actionUrl?.trim() ?? null,
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

    logger.info("Emitting socket notifications to super admins", {
      superAdminCount: superAdmins.length,
      notificationCount: createdNotifications.length,
      title: title.trim(),
    })

    // Emit to each super admin user room với notification từ database
    for (const admin of superAdmins) {
      const dbNotification = createdNotifications.find((n) => n.userId === admin.id)

      if (dbNotification) {
        // Map notification từ database sang socket payload format
        const socketNotification = mapNotificationToPayload(dbNotification)
        storeNotificationInCache(admin.id, socketNotification)
        io.to(`user:${admin.id}`).emit("notification:new", socketNotification)
        logger.debug("Emitted notification to user room", {
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
        logger.debug("Emitted fallback notification to user room", {
          adminId: admin.id,
          room: `user:${admin.id}`,
        })
      }
    }

    // Also emit to role room for broadcast (use first notification if available)
    if (createdNotifications.length > 0) {
      const roleNotification = mapNotificationToPayload(createdNotifications[0])
      io.to("role:super_admin").emit("notification:new", roleNotification)
      logger.debug("Emitted notification to role room", {
        room: "role:super_admin",
        notificationId: createdNotifications[0].id,
      })
    }
  } catch (error) {
    // Log error nhưng không throw để không ảnh hưởng đến main operation
    logger.error("Failed to emit notification to super admins", error instanceof Error ? error : new Error(String(error)))
  }
}

/**
 * Mark notification as read - chỉ cho phép user đánh dấu notification của chính mình
 * Best Practice: Ownership verification trước khi update
 */
export async function markNotificationAsRead(notificationId: string, userId: string) {
  // Validate input
  if (!notificationId || !userId) {
    throw new Error("Notification ID and User ID are required")
  }

  // Verify notification exists and belongs to user
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
    select: { id: true, userId: true, isRead: true },
  })

  if (!notification) {
    logger.warn("Notification not found", { notificationId, userId })
    throw new Error("Notification not found")
  }

  if (notification.userId !== userId) {
    logger.warn("User attempted to mark notification as read without ownership", {
      notificationId,
      userId,
      ownerId: notification.userId,
    })
    throw new Error("Forbidden: You can only mark your own notifications as read")
  }

  // Skip update if already read
  if (notification.isRead) {
    logger.debug("Notification already marked as read", { notificationId, userId })
    return await prisma.notification.findUnique({
      where: { id: notificationId },
    })
  }

  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  })

  logger.info("Notification marked as read", {
    notificationId,
    userId,
  })

  // Emit socket event
  const io = getSocketServer()
  if (io) {
    try {
      const payload = mapNotificationToPayload(updated)
      io.to(`user:${userId}`).emit("notification:updated", payload)
      logger.debug("Socket notification update emitted", { notificationId, userId })
    } catch (error) {
      logger.error("Failed to emit socket notification update", error instanceof Error ? error : new Error(String(error)))
    }
  }

  return updated
}

/**
 * Mark notification as unread - chỉ cho phép user đánh dấu notification của chính mình
 * Best Practice: Ownership verification trước khi update
 */
export async function markNotificationAsUnread(notificationId: string, userId: string) {
  // Validate input
  if (!notificationId || !userId) {
    throw new Error("Notification ID and User ID are required")
  }

  // Verify notification exists and belongs to user
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
    select: { id: true, userId: true, isRead: true },
  })

  if (!notification) {
    logger.warn("Notification not found", { notificationId, userId })
    throw new Error("Notification not found")
  }

  if (notification.userId !== userId) {
    logger.warn("User attempted to mark notification as unread without ownership", {
      notificationId,
      userId,
      ownerId: notification.userId,
    })
    throw new Error("Forbidden: You can only mark your own notifications as unread")
  }

  // Skip update if already unread
  if (!notification.isRead) {
    logger.debug("Notification already marked as unread", { notificationId, userId })
    return await prisma.notification.findUnique({
      where: { id: notificationId },
    })
  }

  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: {
      isRead: false,
      readAt: null,
    },
  })

  logger.info("Notification marked as unread", {
    notificationId,
    userId,
  })

  // Emit socket event
  const io = getSocketServer()
  if (io) {
    try {
      const payload = mapNotificationToPayload(updated)
      io.to(`user:${userId}`).emit("notification:updated", payload)
      logger.debug("Socket notification update emitted", { notificationId, userId })
    } catch (error) {
      logger.error("Failed to emit socket notification update", error instanceof Error ? error : new Error(String(error)))
    }
  }

  return updated
}

/**
 * Delete notification - chỉ cho phép user xóa notification cá nhân của chính mình
 * Thông báo hệ thống (SYSTEM) không bao giờ được xóa
 * Best Practice: Ownership verification và kind check trước khi delete
 */
export async function deleteNotification(notificationId: string, userId: string) {
  // Validate input
  if (!notificationId || !userId) {
    throw new Error("Notification ID and User ID are required")
  }

  // Verify notification exists and belongs to user
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
    select: { id: true, userId: true, kind: true },
  })

  if (!notification) {
    logger.warn("Notification not found for deletion", { notificationId, userId })
    throw new Error("Notification not found")
  }

  if (notification.userId !== userId) {
    logger.warn("User attempted to delete notification without ownership", {
      notificationId,
      userId,
      ownerId: notification.userId,
    })
    throw new Error("Forbidden: You can only delete your own notifications")
  }

  // Không cho phép xóa thông báo hệ thống
  if (notification.kind === NotificationKind.SYSTEM) {
    logger.warn("User attempted to delete system notification", {
      notificationId,
      userId,
      kind: notification.kind,
    })
    throw new Error("Forbidden: System notifications cannot be deleted")
  }

  const deleted = await prisma.notification.delete({
    where: { id: notificationId },
  })

  logger.info("Notification deleted", {
    notificationId,
    userId,
    kind: notification.kind,
  })

  // Emit socket event để remove từ cache
  const io = getSocketServer()
  if (io) {
    try {
      io.to(`user:${userId}`).emit("notification:deleted", { id: notificationId })
      logger.debug("Socket notification deletion emitted", { notificationId, userId })
    } catch (error) {
      logger.error("Failed to emit socket notification deletion", error instanceof Error ? error : new Error(String(error)))
    }
  }

  return deleted
}

/**
 * Bulk mark notifications as read - chỉ cho phép user đánh dấu notifications của chính mình
 * Best Practice: Ownership verification và batch update với userId filter
 */
export async function bulkMarkAsRead(notificationIds: string[], userId: string) {
  // Validate input
  if (!notificationIds || notificationIds.length === 0) {
    return { count: 0 }
  }

  if (!userId) {
    throw new Error("User ID is required")
  }

  // Verify all notifications belong to user
  const notifications = await prisma.notification.findMany({
    where: { id: { in: notificationIds } },
    select: { id: true, userId: true, isRead: true },
  })

  // Filter chỉ notifications của user và chưa đọc
  const ownNotificationIds = notifications
    .filter((n) => n.userId === userId && !n.isRead)
    .map((n) => n.id)

  const invalidNotifications = notifications.filter((n) => n.userId !== userId)
  if (invalidNotifications.length > 0) {
    logger.warn("User attempted to mark notifications as read without ownership", {
      userId,
      invalidCount: invalidNotifications.length,
      totalCount: notificationIds.length,
    })
    throw new Error("Forbidden: You can only mark your own notifications as read")
  }

  if (ownNotificationIds.length === 0) {
    logger.debug("No unread notifications to mark as read", { userId, totalCount: notificationIds.length })
    return { count: 0 }
  }

  const result = await prisma.notification.updateMany({
    where: { 
      id: { in: ownNotificationIds },
      userId, // Double check: chỉ update notifications của user này
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  })

  logger.info("Bulk notifications marked as read", {
    userId,
    count: result.count,
    totalRequested: notificationIds.length,
  })

  // Emit socket event để sync
  const io = getSocketServer()
  if (io && result.count > 0) {
    try {
      // Reload updated notifications và emit
      const updatedNotifications = await prisma.notification.findMany({
        where: { id: { in: ownNotificationIds }, userId },
        take: 50,
      })

      const payloads = updatedNotifications.map(mapNotificationToPayload)
      
      // Update cache
      payloads.forEach((payload) => {
        storeNotificationInCache(userId, payload)
      })

      io.to(`user:${userId}`).emit("notifications:sync", payloads)
      logger.debug("Socket notifications sync emitted", { userId, count: payloads.length })
    } catch (error) {
      logger.error("Failed to emit socket notifications sync", error instanceof Error ? error : new Error(String(error)))
    }
  }

  return { count: result.count }
}

/**
 * Bulk mark notifications as unread - chỉ cho phép user cập nhật notifications của chính mình
 * Best Practice: Ownership verification và batch update với userId filter
 */
export async function bulkMarkAsUnread(notificationIds: string[], userId: string) {
  if (!notificationIds || notificationIds.length === 0) {
    return { count: 0 }
  }

  if (!userId) {
    throw new Error("User ID is required")
  }

  const notifications = await prisma.notification.findMany({
    where: { id: { in: notificationIds } },
    select: { id: true, userId: true, isRead: true },
  })

  const ownNotificationIds = notifications
    .filter((n) => n.userId === userId && n.isRead)
    .map((n) => n.id)

  const invalidNotifications = notifications.filter((n) => n.userId !== userId)
  if (invalidNotifications.length > 0) {
    logger.warn("User attempted to mark notifications as unread without ownership", {
      userId,
      invalidCount: invalidNotifications.length,
      totalCount: notificationIds.length,
    })
    throw new Error("Forbidden: You can only mark your own notifications as unread")
  }

  if (ownNotificationIds.length === 0) {
    logger.debug("No read notifications to mark as unread", { userId, totalCount: notificationIds.length })
    return { count: 0 }
  }

  const result = await prisma.notification.updateMany({
    where: {
      id: { in: ownNotificationIds },
      userId,
    },
    data: {
      isRead: false,
      readAt: null,
    },
  })

  logger.info("Bulk notifications marked as unread", {
    userId,
    count: result.count,
    totalRequested: notificationIds.length,
  })

  const io = getSocketServer()
  if (io && result.count > 0) {
    try {
      const updatedNotifications = await prisma.notification.findMany({
        where: { id: { in: ownNotificationIds }, userId },
        take: 50,
      })

      const payloads = updatedNotifications.map(mapNotificationToPayload)

      payloads.forEach((payload) => {
        storeNotificationInCache(userId, payload)
      })

      io.to(`user:${userId}`).emit("notifications:sync", payloads)
      logger.debug("Socket notifications sync emitted (unread)", { userId, count: payloads.length })
    } catch (error) {
      logger.error(
        "Failed to emit socket notifications sync after marking unread",
        error instanceof Error ? error : new Error(String(error)),
      )
    }
  }

  return { count: result.count }
}

/**
 * Bulk delete notifications - chỉ cho phép user xóa notifications cá nhân của chính mình
 * Thông báo hệ thống (SYSTEM) không bao giờ được xóa
 * Best Practice: Ownership verification và kind check trước khi delete
 */
export async function bulkDelete(notificationIds: string[], userId: string) {
  // Validate input
  if (!notificationIds || notificationIds.length === 0) {
    return { count: 0 }
  }

  if (!userId) {
    throw new Error("User ID is required")
  }

  // Verify all notifications belong to user
  const notifications = await prisma.notification.findMany({
    where: { id: { in: notificationIds } },
    select: { id: true, userId: true, kind: true },
  })

  const invalidNotifications = notifications.filter((n) => n.userId !== userId)
  if (invalidNotifications.length > 0) {
    logger.warn("User attempted to delete notifications without ownership", {
      userId,
      invalidCount: invalidNotifications.length,
      totalCount: notificationIds.length,
    })
    throw new Error("Forbidden: You can only delete your own notifications")
  }

  // Filter out system notifications - không cho phép xóa
  const systemNotifications = notifications.filter((n) => n.kind === NotificationKind.SYSTEM)
  if (systemNotifications.length > 0) {
    logger.warn("User attempted to delete system notifications", {
      userId,
      systemCount: systemNotifications.length,
      totalCount: notificationIds.length,
    })
    // Chỉ xóa các notifications không phải SYSTEM
    const deletableNotifications = notifications.filter((n) => n.kind !== NotificationKind.SYSTEM)
    const deletableIds = deletableNotifications.map((n) => n.id)

    if (deletableIds.length === 0) {
      throw new Error("Forbidden: System notifications cannot be deleted")
    }

    // Xóa chỉ các notifications có thể xóa được
    const result = await prisma.notification.deleteMany({
      where: { 
        id: { in: deletableIds },
        userId, // Double check: chỉ delete notifications của user này
        kind: { not: NotificationKind.SYSTEM }, // Triple check: không xóa SYSTEM
      },
    })

    logger.info("Bulk notifications deleted (some system notifications were skipped)", {
      userId,
      count: result.count,
      skippedSystemCount: systemNotifications.length,
      totalRequested: notificationIds.length,
    })

    // Emit socket event để remove từ cache
    const io = getSocketServer()
    if (io && result.count > 0) {
      try {
        io.to(`user:${userId}`).emit("notifications:deleted", { ids: deletableIds })
        logger.debug("Socket notifications deletion emitted", { userId, count: result.count })
      } catch (error) {
        logger.error("Failed to emit socket notifications deletion", error instanceof Error ? error : new Error(String(error)))
      }
    }

    return { count: result.count }
  }

  // Nếu không có SYSTEM notifications, xóa bình thường
  const ownNotificationIds = notifications.map((n) => n.id)

  const result = await prisma.notification.deleteMany({
    where: { 
      id: { in: ownNotificationIds },
      userId, // Double check: chỉ delete notifications của user này
      kind: { not: NotificationKind.SYSTEM }, // Triple check: không xóa SYSTEM
    },
  })

  logger.info("Bulk notifications deleted", {
    userId,
    count: result.count,
    totalRequested: notificationIds.length,
  })

  // Emit socket event để remove từ cache
  const io = getSocketServer()
  if (io && result.count > 0) {
    try {
      io.to(`user:${userId}`).emit("notifications:deleted", { ids: ownNotificationIds })
      logger.debug("Socket notifications deletion emitted", { userId, count: result.count })
    } catch (error) {
      logger.error("Failed to emit socket notifications deletion", error instanceof Error ? error : new Error(String(error)))
    }
  }

  return { count: result.count }
}
