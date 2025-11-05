/**
 * Server mutations for notifications
 */
import { prisma } from "@/lib/database"

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
