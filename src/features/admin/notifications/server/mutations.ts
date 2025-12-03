import { prisma } from "@/lib/database"
import { NotificationKind, Prisma } from "@prisma/client"
import { DEFAULT_ROLES } from "@/lib/permissions"
import { logger } from "@/lib/config"
import {
  emitNotificationNew,
  emitNotificationNewForSuperAdmins,
  emitNotificationNewForAllAdmins,
  emitNotificationUpdated,
  emitNotificationDeleted,
  emitNotificationsSync,
  emitNotificationsDeleted,
} from "./events"

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

  if (!title || title.trim().length === 0) {
    logger.warn("Invalid notification title", { userId, title })
    return null
  }

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

  await emitNotificationNew(notification)

  return notification
}

export async function createNotificationForSuperAdmins(
  title: string,
  description?: string | null,
  actionUrl?: string | null,
  kind: NotificationKind = NotificationKind.SYSTEM,
  metadata?: Record<string, unknown> | null
) {
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

export async function createNotificationForAllAdmins(
  title: string,
  description?: string | null,
  actionUrl?: string | null,
  kind: NotificationKind = NotificationKind.SYSTEM,
  metadata?: Record<string, unknown> | null
) {
  const allAdmins = await prisma.user.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      userRoles: {
        some: {
          role: {
            name: {
              in: [DEFAULT_ROLES.SUPER_ADMIN.name, DEFAULT_ROLES.ADMIN.name],
            },
            isActive: true,
            deletedAt: null,
          },
        },
      },
    },
    select: { id: true, email: true },
  })

  if (!title || title.trim().length === 0) {
    logger.warn("Invalid notification title for all admins", { title })
    return { count: 0 }
  }

  logger.info("Found all admins for notification", {
    count: allAdmins.length,
    adminIds: allAdmins.map((a) => a.id),
    adminEmails: allAdmins.map((a) => a.email),
  })

  if (allAdmins.length === 0) {
    logger.warn("No admin found to receive notification")
    return { count: 0 }
  }

  // Create notifications for all admins
  const notifications = await prisma.notification.createMany({
    data: allAdmins.map((admin) => ({
      userId: admin.id,
      title: title.trim(),
      description: description?.trim() ?? null,
      actionUrl: actionUrl?.trim() ?? null,
      kind,
      metadata: metadata ? (metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
      isRead: false,
    })),
  })

  logger.info("Notifications created for all admins", {
    count: notifications.count,
    title: title.trim(),
    adminCount: allAdmins.length,
    kind,
  })

  return { count: notifications.count }
}

export async function emitNotificationToSuperAdminsAfterCreate(
  title: string,
  description?: string | null,
  actionUrl?: string | null,
  kind: NotificationKind = NotificationKind.SYSTEM,
  _metadata?: Record<string, unknown> | null
) {
  try {
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

    await emitNotificationNewForSuperAdmins(createdNotifications)
  } catch (error) {
    logger.error("Failed to emit notification to super admins", error instanceof Error ? error : new Error(String(error)))
  }
}

export async function emitNotificationToAllAdminsAfterCreate(
  title: string,
  description?: string | null,
  actionUrl?: string | null,
  kind: NotificationKind = NotificationKind.SYSTEM,
  _metadata?: Record<string, unknown> | null
) {
  try {
    const allAdmins = await prisma.user.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        userRoles: {
          some: {
            role: {
              name: {
                in: [DEFAULT_ROLES.SUPER_ADMIN.name, DEFAULT_ROLES.ADMIN.name],
              },
              isActive: true,
              deletedAt: null,
            },
          },
        },
      },
      select: { id: true },
    })

    if (allAdmins.length === 0) {
      logger.warn("No admin found to emit notification")
      return
    }

    const createdNotifications = await prisma.notification.findMany({
      where: {
        title: title.trim(),
        description: description?.trim() ?? null,
        actionUrl: actionUrl?.trim() ?? null,
        kind,
        userId: {
          in: allAdmins.map((a) => a.id),
        },
        createdAt: {
          gte: new Date(Date.now() - 5000), // Created within last 5 seconds
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: allAdmins.length,
    })

    logger.info("Emitting socket notifications to all admins", {
      adminCount: allAdmins.length,
      notificationCount: createdNotifications.length,
      title: title.trim(),
    })

    await emitNotificationNewForAllAdmins(createdNotifications)
  } catch (error) {
    logger.error("Failed to emit notification to all admins", error instanceof Error ? error : new Error(String(error)))
  }
}

export async function markNotificationAsRead(notificationId: string, userId: string) {
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

  emitNotificationUpdated(updated)

  return updated
}

export async function markNotificationAsUnread(notificationId: string, userId: string) {
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

  emitNotificationUpdated(updated)

  return updated
}

export async function deleteNotification(notificationId: string, userId: string) {
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

  emitNotificationDeleted(notificationId, userId)

  return deleted
}

export async function bulkMarkAsRead(notificationIds: string[], userId: string) {
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
      userId,
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

  if (result.count > 0) {
    await emitNotificationsSync(ownNotificationIds, userId)
  }

  return { count: result.count }
}

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

  if (result.count > 0) {
    await emitNotificationsSync(ownNotificationIds, userId)
  }

  return { count: result.count }
}

export async function bulkDelete(notificationIds: string[], userId: string) {
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

  const systemNotifications = notifications.filter((n) => n.kind === NotificationKind.SYSTEM)
  if (systemNotifications.length > 0) {
    logger.warn("User attempted to delete system notifications", {
      userId,
      systemCount: systemNotifications.length,
      totalCount: notificationIds.length,
    })
    const deletableNotifications = notifications.filter((n) => n.kind !== NotificationKind.SYSTEM)
    const deletableIds = deletableNotifications.map((n) => n.id)

    if (deletableIds.length === 0) {
      throw new Error("Forbidden: System notifications cannot be deleted")
    }

    const result = await prisma.notification.deleteMany({
      where: { 
        id: { in: deletableIds },
        userId,
        kind: { not: NotificationKind.SYSTEM },
      },
    })

    logger.info("Bulk notifications deleted (some system notifications were skipped)", {
      userId,
      count: result.count,
      skippedSystemCount: systemNotifications.length,
      totalRequested: notificationIds.length,
    })

    if (result.count > 0) {
      emitNotificationsDeleted(deletableIds, userId)
    }

    return { count: result.count }
  }

  const ownNotificationIds = notifications.map((n) => n.id)

  const result = await prisma.notification.deleteMany({
    where: { 
      id: { in: ownNotificationIds },
      userId,
      kind: { not: NotificationKind.SYSTEM },
    },
  })

  logger.info("Bulk notifications deleted", {
    userId,
    count: result.count,
    totalRequested: notificationIds.length,
  })

  if (result.count > 0) {
    emitNotificationsDeleted(ownNotificationIds, userId)
  }

  return { count: result.count }
}
