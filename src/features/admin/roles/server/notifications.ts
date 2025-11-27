import { prisma } from "@/lib/database"
import { logger, resourceLogger } from "@/lib/config"
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

export async function notifySuperAdminsOfRoleAction(
  action: "create" | "update" | "delete" | "restore" | "hard-delete",
  actorId: string,
  role: { id: string; name: string; displayName: string },
  changes?: {
    name?: { old: string; new: string }
    displayName?: { old: string; new: string }
    description?: { old: string | null; new: string | null }
    permissions?: { old: string[]; new: string[] }
    isActive?: { old: boolean; new: boolean }
  }
) {
  try {
    logger.debug("[notifySuperAdmins] Starting role notification", {
      action,
      actorId,
      roleId: role.id,
      roleName: role.name,
      hasChanges: !!changes,
      changesKeys: changes ? Object.keys(changes) : [],
    })

    const actor = await getActorInfo(actorId)
    const actorName = actor?.name || actor?.email || "Hệ thống"

    let title = ""
    let description = ""
    const actionUrl = `/admin/roles/${role.id}`

    switch (action) {
      case "create":
        title = "👤 Vai trò mới được tạo"
        description = `${actorName} đã tạo vai trò "${role.displayName}" (${role.name})`
        break
      case "update":
        const changeDescriptions: string[] = []
        if (changes?.name) {
          changeDescriptions.push(`Tên: ${changes.name.old} → ${changes.name.new}`)
        }
        if (changes?.displayName) {
          changeDescriptions.push(`Tên hiển thị: ${changes.displayName.old} → ${changes.displayName.new}`)
        }
        if (changes?.description) {
          changeDescriptions.push(`Mô tả: ${changes.description.old || "trống"} → ${changes.description.new || "trống"}`)
        }
        if (changes?.permissions) {
          const oldCount = changes.permissions.old.length
          const newCount = changes.permissions.new.length
          changeDescriptions.push(`Quyền: ${oldCount} → ${newCount}`)
        }
        if (changes?.isActive) {
          changeDescriptions.push(`Trạng thái: ${changes.isActive.old ? "Hoạt động" : "Tạm khóa"} → ${changes.isActive.new ? "Hoạt động" : "Tạm khóa"}`)
        }
        title = "✏️ Vai trò được cập nhật"
        description = `${actorName} đã cập nhật vai trò "${role.displayName}"${
          changeDescriptions.length > 0 ? `\nThay đổi: ${changeDescriptions.join(", ")}` : ""
        }`
        break
      case "delete":
        title = "🗑️ Vai trò bị xóa"
        description = `${actorName} đã xóa vai trò "${role.displayName}"`
        break
      case "restore":
        title = "♻️ Vai trò được khôi phục"
        description = `${actorName} đã khôi phục vai trò "${role.displayName}"`
        break
      case "hard-delete":
        title = "⚠️ Vai trò bị xóa vĩnh viễn"
        description = `${actorName} đã xóa vĩnh viễn vai trò "${role.displayName}"`
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
        type: `role_${action}`,
        actorId,
        actorName: actor?.name || actor?.email,
        actorEmail: actor?.email,
        roleId: role.id,
        roleName: role.name,
        roleDisplayName: role.displayName,
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
            id: `role-${action}-${role.id}-${Date.now()}`,
            kind: "system" as const,
            title,
            description,
            actionUrl,
            timestamp: Date.now(),
            read: false,
            toUserId: admin.id,
            metadata: {
              type: `role_${action}`,
              actorId,
              roleId: role.id,
              roleName: role.name,
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
    logger.error("[notifications] Failed to notify super admins of role action", error as Error)
  }
}

function formatRoleNames(roles: Array<{ displayName: string }>, maxNames = 3): string {
  if (!roles || roles.length === 0) return ""
  
  const displayNames = roles.slice(0, maxNames).map(r => `"${r.displayName}"`)
  const remainingCount = roles.length > maxNames ? roles.length - maxNames : 0
  
  if (remainingCount > 0) {
    return `${displayNames.join(", ")} và ${remainingCount} vai trò khác`
  }
  return displayNames.join(", ")
}

export async function notifySuperAdminsOfBulkRoleAction(
  action: "delete" | "restore" | "hard-delete",
  actorId: string,
  count: number,
  roles?: Array<{ displayName: string }>
) {
  const startTime = Date.now()
  
  resourceLogger.actionFlow({
    resource: "roles",
    action: action === "delete" ? "bulk-delete" : action === "restore" ? "bulk-restore" : "bulk-hard-delete",
    step: "start",
    metadata: { count, roleCount: roles?.length || 0, actorId },
  })

  try {
    const actor = await getActorInfo(actorId)
    const actorName = actor?.name || actor?.email || "Hệ thống"

    let title = ""
    let description = ""

    // Format role names - hiển thị tối đa 3 tên đầu tiên
    const namesText = roles && roles.length > 0 ? formatRoleNames(roles, 3) : ""

    switch (action) {
      case "delete":
        title = `🗑️ ${count} Vai trò bị xóa`
        description = namesText 
          ? `${actorName} đã xóa ${count} vai trò: ${namesText}`
          : `${actorName} đã xóa ${count} vai trò`
        break
      case "restore":
        title = `♻️ ${count} Vai trò được khôi phục`
        description = namesText
          ? `${actorName} đã khôi phục ${count} vai trò: ${namesText}`
          : `${actorName} đã khôi phục ${count} vai trò`
        break
      case "hard-delete":
        title = `⚠️ ${count} Vai trò bị xóa vĩnh viễn`
        description = namesText
          ? `${actorName} đã xóa vĩnh viễn ${count} vai trò: ${namesText}`
          : `${actorName} đã xóa vĩnh viễn ${count} vai trò`
        break
    }

    const actionUrl = `/admin/roles`

    const result = await createNotificationForSuperAdmins(
      title,
      description,
      actionUrl,
      NotificationKind.SYSTEM,
      {
        type: `role_bulk_${action}`,
        actorId,
        actorName: actor?.name || actor?.email,
        actorEmail: actor?.email,
        count,
        roleNames: roles?.map(r => r.displayName) || [],
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
      resource: "roles",
      action: action === "delete" ? "bulk-delete" : action === "restore" ? "bulk-restore" : "bulk-hard-delete",
      step: "success",
      duration: Date.now() - startTime,
      metadata: { count, roleCount: roles?.length || 0 },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    resourceLogger.actionFlow({
      resource: "roles",
      action: action === "delete" ? "bulk-delete" : action === "restore" ? "bulk-restore" : "bulk-hard-delete",
      step: "error",
      duration: Date.now() - startTime,
      metadata: { 
        count, 
        roleCount: roles?.length || 0,
        error: errorMessage,
        errorStack: error instanceof Error ? error.stack : undefined,
      },
    })
  }
}

