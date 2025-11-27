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
    const actor = await getActorInfo(actorId)

    let title = ""
    let description = ""
    const actionUrl = `/admin/students/${student.id}`

    const studentDisplay = student.name || student.studentCode

    switch (action) {
      case "create":
        title = "Tạo học sinh"
        description = studentDisplay
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
        title = "Cập nhật học sinh"
        description = `${studentDisplay}${changeDescriptions.length > 0 ? `\n${changeDescriptions.join(", ")}` : ""}`
        break
      case "delete":
        title = "Xóa học sinh"
        description = studentDisplay
        break
      case "restore":
        title = "Khôi phục học sinh"
        description = studentDisplay
        break
      case "hard-delete":
        title = "Xóa vĩnh viễn học sinh"
        description = studentDisplay
        break
    }

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
        }
      }

      if (createdNotifications.length > 0) {
        const roleNotification = mapNotificationToPayload(createdNotifications[0])
        io.to("role:super_admin").emit("notification:new", roleNotification)
      }
    }
  } catch (error) {
    resourceLogger.actionFlow({
      resource: "students",
      action: "error",
      step: "error",
      metadata: { 
        action: "notify-super-admins", 
        studentId: student.id,
        error: error instanceof Error ? error.message : "Unknown error",
      },
    })
  }
}

export function formatStudentNames(
  students: Array<{ studentCode: string; name: string | null }>,
  maxDisplay: number = 3
): string {
  if (students.length === 0) return ""
  
  const names = students.slice(0, maxDisplay).map((s) => {
    return s.name || s.studentCode || "Không xác định"
  })
  
  if (students.length <= maxDisplay) {
    return names.join(", ")
  }
  
  const remaining = students.length - maxDisplay
  return `${names.join(", ")} và ${remaining} học sinh khác`
}

export async function notifySuperAdminsOfBulkStudentAction(
  action: "delete" | "restore" | "hard-delete",
  actorId: string,
  students: Array<{ studentCode: string; name: string | null }>
): Promise<void> {
  if (students.length === 0) return

  try {
    const actor = await getActorInfo(actorId)

    const namesText = formatStudentNames(students, 3)
    const count = students.length

    let title = ""
    let description = ""

    switch (action) {
      case "delete":
        title = `Xóa ${count} học sinh`
        description = namesText || `${count} học sinh`
        break
      case "restore":
        title = `Khôi phục ${count} học sinh`
        description = namesText || `${count} học sinh`
        break
      case "hard-delete":
        title = `Xóa vĩnh viễn ${count} học sinh`
        description = namesText || `${count} học sinh`
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
        studentCount: count,
        studentNames: students.map(s => s.name || s.studentCode),
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
      resource: "students",
      action: "error",
      step: "error",
      metadata: { 
        action: "notify-super-admins-bulk",
        count: students.length,
        error: error instanceof Error ? error.message : "Unknown error",
      },
    })
  }
}

