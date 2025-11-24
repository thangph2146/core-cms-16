/**
 * Helper functions để emit notifications realtime cho comments actions
 */

import { prisma } from "@/lib/database"
import { resourceLogger } from "@/lib/config"
import { getSocketServer, mapNotificationToPayload } from "@/lib/socket/state"
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
 * Format comment names cho bulk notifications
 * Rút gọn: chỉ hiển thị author name/email, không cần content preview
 */
export function formatCommentNames(
  comments: Array<{ authorName: string | null; authorEmail: string; content?: string }>,
  maxDisplay: number = 3
): string {
  if (comments.length === 0) return ""
  
  const names = comments.slice(0, maxDisplay).map((c) => {
    return c.authorName || c.authorEmail || "Không xác định"
  })
  
  if (comments.length <= maxDisplay) {
    return names.join(", ")
  }
  
  const remaining = comments.length - maxDisplay
  return `${names.join(", ")} và ${remaining} bình luận khác`
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
    const actor = await getActorInfo(actorId)
    const _actorName = actor?.name || actor?.email || "Hệ thống"
    const authorName = comment.authorName || comment.authorEmail

    let title = ""
    let description = ""
    const actionUrl = `/admin/comments/${comment.id}`

    switch (action) {
      case "approve":
        title = "Bình luận được duyệt"
        description = `${authorName} - "${comment.postTitle}"`
        break
      case "unapprove":
        title = "Bình luận bị hủy duyệt"
        description = `${authorName} - "${comment.postTitle}"`
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
        title = "Bình luận được cập nhật"
        description = `${authorName} - "${comment.postTitle}"${changeDescriptions.length > 0 ? `\n${changeDescriptions.join(", ")}` : ""}`
        break
      case "delete":
        title = "Bình luận bị xóa"
        description = `${authorName} - "${comment.postTitle}"`
        break
      case "restore":
        title = "Bình luận được khôi phục"
        description = `${authorName} - "${comment.postTitle}"`
        break
      case "hard-delete":
        title = "Bình luận bị xóa vĩnh viễn"
        description = `${authorName} - "${comment.postTitle}"`
        break
    }

    // Tạo notifications trong DB cho tất cả super admins
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

    // Emit socket event nếu có socket server
    const io = getSocketServer()
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

      // Emit to role room (tất cả super admins đều ở trong role room)
      // Không cần emit đến từng user room để tránh duplicate events
      if (createdNotifications.length > 0) {
        const roleNotification = mapNotificationToPayload(createdNotifications[0])
        io.to("role:super_admin").emit("notification:new", roleNotification)
      }
    }
  } catch (error) {
    // Log error nhưng không throw để không ảnh hưởng đến main operation
    resourceLogger.actionFlow({
      resource: "comments",
      action: "error",
      step: "error",
      metadata: { 
        action: "notify-super-admins", 
        commentId: comment.id,
        error: error instanceof Error ? error.message : "Unknown error",
      },
    })
  }
}

/**
 * Helper function để tạo system notification cho super admin về bulk comment actions
 */
export async function notifySuperAdminsOfBulkCommentAction(
  action: "approve" | "unapprove" | "delete" | "restore" | "hard-delete",
  actorId: string,
  comments: Array<{ id: string; content: string; authorName: string | null; authorEmail: string; postTitle: string }>
) {
  if (comments.length === 0) return

  try {
    const actor = await getActorInfo(actorId)
    const _actorName = actor?.name || actor?.email || "Hệ thống"

    const namesText = formatCommentNames(comments, 3)
    const count = comments.length

    let title = ""
    let description = ""

    switch (action) {
      case "approve":
        title = `${count} Bình luận được duyệt`
        description = namesText ? `${namesText}` : `${count} bình luận`
        break
      case "unapprove":
        title = `${count} Bình luận bị hủy duyệt`
        description = namesText ? `${namesText}` : `${count} bình luận`
        break
      case "delete":
        title = `${count} Bình luận bị xóa`
        description = namesText ? `${namesText}` : `${count} bình luận`
        break
      case "restore":
        title = `${count} Bình luận được khôi phục`
        description = namesText ? `${namesText}` : `${count} bình luận`
        break
      case "hard-delete":
        title = `${count} Bình luận bị xóa vĩnh viễn`
        description = namesText ? `${namesText}` : `${count} bình luận`
        break
    }

    const result = await createNotificationForSuperAdmins(
      title,
      description,
      "/admin/comments",
      NotificationKind.SYSTEM,
      {
        type: `comment_bulk_${action}`,
        actorId,
        actorName: actor?.name || actor?.email,
        actorEmail: actor?.email,
        count,
        commentIds: comments.map((c) => c.id),
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

      // Emit to role room (tất cả super admins đều ở trong role room)
      // Không cần emit đến từng user room để tránh duplicate events
      if (createdNotifications.length > 0) {
        const roleNotification = mapNotificationToPayload(createdNotifications[0])
        io.to("role:super_admin").emit("notification:new", roleNotification)
      }
    }
  } catch (error) {
    resourceLogger.actionFlow({
      resource: "comments",
      action: "error",
      step: "error",
      metadata: { 
        action: "notify-super-admins-bulk",
        count: comments.length,
        error: error instanceof Error ? error.message : "Unknown error",
      },
    })
  }
}

