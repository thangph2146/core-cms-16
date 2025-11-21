/**
 * Helper functions để emit notifications realtime cho categories actions
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
 * Helper function để tạo system notification cho super admin về category actions
 */
export async function notifySuperAdminsOfCategoryAction(
  action: "create" | "update" | "delete" | "restore" | "hard-delete",
  actorId: string,
  category: { id: string; name: string; slug: string },
  changes?: {
    name?: { old: string; new: string }
    slug?: { old: string; new: string }
    description?: { old: string | null; new: string | null }
  }
) {
  try {
    logger.debug("[notifySuperAdmins] Starting notification", {
      action,
      actorId,
      categoryId: category.id,
      categoryName: category.name,
      hasChanges: !!changes,
      changesKeys: changes ? Object.keys(changes) : [],
    })

    const actor = await getActorInfo(actorId)
    const actorName = actor?.name || actor?.email || "Hệ thống"

    let title = ""
    let description = ""
    const actionUrl = `/admin/categories/${category.id}`

    switch (action) {
      case "create":
        title = "📁 Danh mục mới được tạo"
        description = `${actorName} đã tạo danh mục "${category.name}" (${category.slug})`
        break
      case "update":
        const changeDescriptions: string[] = []
        if (changes?.name) {
          changeDescriptions.push(`Tên: ${changes.name.old} → ${changes.name.new}`)
        }
        if (changes?.slug) {
          changeDescriptions.push(`Slug: ${changes.slug.old} → ${changes.slug.new}`)
        }
        if (changes?.description) {
          const oldDesc = changes.description.old || "(trống)"
          const newDesc = changes.description.new || "(trống)"
          changeDescriptions.push(`Mô tả: ${oldDesc} → ${newDesc}`)
        }
        title = "✏️ Danh mục được cập nhật"
        description = `${actorName} đã cập nhật danh mục "${category.name}"${
          changeDescriptions.length > 0 ? `\nThay đổi: ${changeDescriptions.join(", ")}` : ""
        }`
        break
      case "delete":
        title = "🗑️ Danh mục bị xóa"
        description = `${actorName} đã xóa danh mục "${category.name}"`
        break
      case "restore":
        title = "♻️ Danh mục được khôi phục"
        description = `${actorName} đã khôi phục danh mục "${category.name}"`
        break
      case "hard-delete":
        title = "⚠️ Danh mục bị xóa vĩnh viễn"
        description = `${actorName} đã xóa vĩnh viễn danh mục "${category.name}"`
        break
    }

    // Tạo notifications trong DB cho tất cả super admins
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
        type: `category_${action}`,
        actorId,
        actorName: actor?.name || actor?.email,
        actorEmail: actor?.email,
        categoryId: category.id,
        categoryName: category.name,
        categorySlug: category.slug,
        ...(changes && { changes }),
        timestamp: new Date().toISOString(),
      }
    )
    logger.debug("[notifySuperAdmins] Notifications created", {
      count: result.count,
      action,
    })

    // Emit socket event nếu có socket server
    const io = getSocketServer()
    logger.debug("[notifySuperAdmins] Socket server status", {
      hasSocketServer: !!io,
      notificationCount: result.count,
    })
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

      logger.debug("[notifySuperAdmins] Found super admins", {
        count: superAdmins.length,
        adminIds: superAdmins.map((a) => a.id),
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
      for (let i = 0; i < superAdmins.length; i++) {
        const admin = superAdmins[i]
        const dbNotification = createdNotifications.find((n) => n.userId === admin.id)
        
        if (dbNotification) {
          // Map notification từ database sang socket payload format
          const socketNotification = mapNotificationToPayload(dbNotification)
          storeNotificationInCache(admin.id, socketNotification)
          io.to(`user:${admin.id}`).emit("notification:new", socketNotification)
          logger.debug("[notifySuperAdmins] Emitted to user room", {
            adminId: admin.id,
            room: `user:${admin.id}`,
            notificationId: dbNotification.id,
          })
        } else {
          // Fallback nếu không tìm thấy notification trong database
          const fallbackNotification = {
            id: `category-${action}-${category.id}-${Date.now()}`,
            kind: "system" as const,
            title,
            description,
            actionUrl,
            timestamp: Date.now(),
            read: false,
            toUserId: admin.id,
            metadata: {
              type: `category_${action}`,
              actorId,
              categoryId: category.id,
              categoryName: category.name,
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

      // Also emit to role room for broadcast (use first notification if available)
      if (createdNotifications.length > 0) {
        const roleNotification = mapNotificationToPayload(createdNotifications[0])
        io.to("role:super_admin").emit("notification:new", roleNotification)
        logger.debug("[notifySuperAdmins] Emitted to role room: role:super_admin")
      }
    }
  } catch (error) {
    // Log error nhưng không throw để không ảnh hưởng đến main operation
    logger.error("[notifications] Failed to notify super admins of category action", error as Error)
  }
}

