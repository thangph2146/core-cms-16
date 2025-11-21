/**
 * Helper functions để emit notifications realtime cho students actions
 */

import { prisma } from "@/lib/database"
import { logger } from "@/lib/config"
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
 * Helper function để tạo system notification cho super admin về student actions
 */
export async function notifySuperAdminsOfStudentAction(
  action: "create" | "update" | "delete" | "restore" | "hard-delete",
  actorId: string,
  student: { id: string; studentCode: string; name: string | null },
  changes?: {
    studentCode?: { old: string; new: string }
    name?: { old: string | null; new: string | null }
    email?: { old: string | null; new: string | null }
    isActive?: { old: boolean; new: boolean }
  }
) {
  try {
    logger.debug("[notifySuperAdmins] Starting student notification", {
      action,
      actorId,
      studentId: student.id,
      studentCode: student.studentCode,
      hasChanges: !!changes,
      changesKeys: changes ? Object.keys(changes) : [],
    })

    const actor = await getActorInfo(actorId)
    const actorName = actor?.name || actor?.email || "Hệ thống"

    let title = ""
    let description = ""
    const actionUrl = `/admin/students/${student.id}`

    switch (action) {
      case "create":
        title = "👨‍🎓 Học sinh mới được tạo"
        description = `${actorName} đã tạo học sinh "${student.studentCode}"${student.name ? ` - ${student.name}` : ""}`
        break
      case "update":
        const changeDescriptions: string[] = []
        if (changes?.studentCode) {
          changeDescriptions.push(`Mã học sinh: ${changes.studentCode.old} → ${changes.studentCode.new}`)
        }
        if (changes?.name) {
          changeDescriptions.push(`Tên: ${changes.name.old || "trống"} → ${changes.name.new || "trống"}`)
        }
        if (changes?.email) {
          changeDescriptions.push(`Email: ${changes.email.old || "trống"} → ${changes.email.new || "trống"}`)
        }
        if (changes?.isActive) {
          changeDescriptions.push(`Trạng thái: ${changes.isActive.old ? "Hoạt động" : "Vô hiệu hóa"} → ${changes.isActive.new ? "Hoạt động" : "Vô hiệu hóa"}`)
        }
        title = "✏️ Học sinh được cập nhật"
        description = `${actorName} đã cập nhật học sinh "${student.studentCode}"${
          changeDescriptions.length > 0 ? `\nThay đổi: ${changeDescriptions.join(", ")}` : ""
        }`
        break
      case "delete":
        title = "🗑️ Học sinh bị xóa"
        description = `${actorName} đã xóa học sinh "${student.studentCode}"`
        break
      case "restore":
        title = "♻️ Học sinh được khôi phục"
        description = `${actorName} đã khôi phục học sinh "${student.studentCode}"`
        break
      case "hard-delete":
        title = "⚠️ Học sinh bị xóa vĩnh viễn"
        description = `${actorName} đã xóa vĩnh viễn học sinh "${student.studentCode}"`
        break
    }

    logger.debug("[notifySuperAdmins] Creating notifications in DB", {
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
        type: `student_${action}`,
        actorId,
        actorName: actor?.name || actor?.email,
        actorEmail: actor?.email,
        studentId: student.id,
        studentCode: student.studentCode,
        studentName: student.name,
        ...(changes && { changes }),
        timestamp: new Date().toISOString(),
      }
    )
    logger.debug("[notifySuperAdmins] Notifications created", {
      count: result.count,
      action,
    })

    const io = getSocketServer()
    logger.debug("[notifySuperAdmins] Socket server status", {
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

      logger.debug("[notifySuperAdmins] Found super admins", {
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
          logger.debug("[notifySuperAdmins] Emitted to user room", {
            adminId: admin.id,
            room: `user:${admin.id}`,
            notificationId: dbNotification.id,
          })
        } else {
          const fallbackNotification = {
            id: `student-${action}-${student.id}-${Date.now()}`,
            kind: "system" as const,
            title,
            description,
            actionUrl,
            timestamp: Date.now(),
            read: false,
            toUserId: admin.id,
            metadata: {
              type: `student_${action}`,
              actorId,
              studentId: student.id,
              studentCode: student.studentCode,
              studentName: student.name,
              ...(changes && { changes }),
            },
          }
          storeNotificationInCache(admin.id, fallbackNotification)
          io.to(`user:${admin.id}`).emit("notification:new", fallbackNotification)
          logger.debug("[notifySuperAdmins] Emitted fallback notification to user room", {
            adminId: admin.id,
            room: `user:${admin.id}`,
          })
        }
      }

      if (createdNotifications.length > 0) {
        const roleNotification = mapNotificationToPayload(createdNotifications[0])
        io.to("role:super_admin").emit("notification:new", roleNotification)
        logger.debug("[notifySuperAdmins] Emitted to role room: role:super_admin")
      }
    }
  } catch (error) {
    logger.error("[notifications] Failed to notify super admins of student action", error as Error)
  }
}

/**
 * Bulk notification cho bulk operations - emit một notification tổng hợp thay vì từng cái một
 * Để tránh timeout khi xử lý nhiều students
 */
export async function notifySuperAdminsOfBulkStudentAction(
  action: "delete" | "restore" | "hard-delete",
  actorId: string,
  count: number
) {
  try {
    const actor = await getActorInfo(actorId)
    const actorName = actor?.name || actor?.email || "Hệ thống"

    let title = ""
    let description = ""

    switch (action) {
      case "delete":
        title = "🗑️ Nhiều học sinh bị xóa"
        description = `${actorName} đã xóa ${count} học sinh`
        break
      case "restore":
        title = "♻️ Nhiều học sinh được khôi phục"
        description = `${actorName} đã khôi phục ${count} học sinh`
        break
      case "hard-delete":
        title = "⚠️ Nhiều học sinh bị xóa vĩnh viễn"
        description = `${actorName} đã xóa vĩnh viễn ${count} học sinh`
        break
    }

    const actionUrl = `/admin/students`

    const result = await createNotificationForSuperAdmins(
      title,
      description,
      actionUrl,
      NotificationKind.SYSTEM,
      {
        type: `student_bulk_${action}`,
        actorId,
        actorName: actor?.name || actor?.email,
        actorEmail: actor?.email,
        count,
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
    logger.error("[notifications] Failed to notify super admins of bulk student action", error as Error)
  }
}

