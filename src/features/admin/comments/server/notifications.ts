/**
 * Helper functions để emit notifications realtime cho comments actions
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
 * Helper function để tạo system notification cho super admin về comment actions
 */
export async function notifySuperAdminsOfCommentAction(
  action: "approve" | "unapprove" | "update" | "delete" | "restore" | "hard-delete",
  actorId: string,
  comment: { id: string; content: string; authorName: string | null; authorEmail: string; postTitle: string },
  changes?: {
    content?: { old: string; new: string }
    approved?: { old: boolean; new: boolean }
  }
) {
  try {
    logger.debug("[notifySuperAdmins] Starting notification", {
      action,
      actorId,
      commentId: comment.id,
      hasChanges: !!changes,
      changesKeys: changes ? Object.keys(changes) : [],
    })

    const actor = await getActorInfo(actorId)
    const actorName = actor?.name || actor?.email || "Hệ thống"
    const authorName = comment.authorName || comment.authorEmail

    let title = ""
    let description = ""
    const actionUrl = `/admin/comments/${comment.id}`

    switch (action) {
      case "approve":
        title = "✅ Bình luận được duyệt"
        description = `${actorName} đã duyệt bình luận từ ${authorName} trong bài viết "${comment.postTitle}"`
        break
      case "unapprove":
        title = "❌ Bình luận bị hủy duyệt"
        description = `${actorName} đã hủy duyệt bình luận từ ${authorName} trong bài viết "${comment.postTitle}"`
        break
      case "update":
        const changeDescriptions: string[] = []
        if (changes?.content) {
          const oldContent = changes.content.old.length > 50 ? changes.content.old.substring(0, 50) + "..." : changes.content.old
          const newContent = changes.content.new.length > 50 ? changes.content.new.substring(0, 50) + "..." : changes.content.new
          changeDescriptions.push(`Nội dung: ${oldContent} → ${newContent}`)
        }
        if (changes?.approved !== undefined) {
          changeDescriptions.push(
            `Trạng thái: ${changes.approved.old ? "Đã duyệt" : "Chưa duyệt"} → ${changes.approved.new ? "Đã duyệt" : "Chưa duyệt"}`
          )
        }
        title = "✏️ Bình luận được cập nhật"
        description = `${actorName} đã cập nhật bình luận từ ${authorName} trong bài viết "${comment.postTitle}"${
          changeDescriptions.length > 0 ? `\nThay đổi: ${changeDescriptions.join(", ")}` : ""
        }`
        break
      case "delete":
        title = "🗑️ Bình luận bị xóa"
        description = `${actorName} đã xóa bình luận từ ${authorName} trong bài viết "${comment.postTitle}"`
        break
      case "restore":
        title = "♻️ Bình luận được khôi phục"
        description = `${actorName} đã khôi phục bình luận từ ${authorName} trong bài viết "${comment.postTitle}"`
        break
      case "hard-delete":
        title = "⚠️ Bình luận bị xóa vĩnh viễn"
        description = `${actorName} đã xóa vĩnh viễn bình luận từ ${authorName} trong bài viết "${comment.postTitle}"`
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
        type: `comment_${action}`,
        actorId,
        actorName: actor?.name || actor?.email,
        actorEmail: actor?.email,
        commentId: comment.id,
        commentContent: comment.content.length > 100 ? comment.content.substring(0, 100) + "..." : comment.content,
        authorName: comment.authorName,
        authorEmail: comment.authorEmail,
        postTitle: comment.postTitle,
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
            id: `comment-${action}-${comment.id}-${Date.now()}`,
            kind: "system" as const,
            title,
            description,
            actionUrl,
            timestamp: Date.now(),
            read: false,
            toUserId: admin.id,
            metadata: {
              type: `comment_${action}`,
              actorId,
              commentId: comment.id,
              authorName: comment.authorName,
              authorEmail: comment.authorEmail,
              postTitle: comment.postTitle,
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
    logger.error("[notifications] Failed to notify super admins of comment action", error as Error)
  }
}

