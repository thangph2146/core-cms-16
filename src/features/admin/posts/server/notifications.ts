import { prisma } from "@/lib/database"
import { resourceLogger } from "@/lib/config"
import { createNotificationForAllAdmins, emitNotificationToAllAdminsAfterCreate } from "@/features/admin/notifications/server/mutations"
import { NotificationKind } from "@prisma/client"

async function getActorInfo(actorId: string) {
  const actor = await prisma.user.findUnique({
    where: { id: actorId },
    select: { id: true, email: true, name: true },
  })
  return actor
}

function formatPostTitles(posts: Array<{ title: string }>, maxTitles = 3): string {
  if (!posts || posts.length === 0) return ""
  
  const displayTitles = posts.slice(0, maxTitles).map(p => p.title)
  const remainingCount = posts.length > maxTitles ? posts.length - maxTitles : 0
  
  if (remainingCount > 0) {
    return `${displayTitles.join(", ")} và ${remainingCount} bài viết khác`
  }
  return displayTitles.join(", ")
}

export async function notifySuperAdminsOfPostAction(
  action: "create" | "update" | "delete" | "restore" | "hard-delete",
  actorId: string,
  targetPost: { id: string; title: string; slug: string },
  changes?: {
    title?: { old: string; new: string }
    published?: { old: boolean; new: boolean }
  }
) {
  try {
    const actor = await getActorInfo(actorId)
    const actorName = actor?.name || actor?.email || "Hệ thống"
    const targetPostTitle = targetPost.title

    let title = ""
    let description = ""
    const actionUrl = `/admin/posts/${targetPost.id}`

    switch (action) {
      case "create":
        title = "📝 Bài viết mới được tạo"
        description = `${actorName} đã tạo bài viết mới: ${targetPostTitle}`
        break
      case "update":
        const changeDescriptions: string[] = []
        if (changes?.title) {
          changeDescriptions.push(`Tiêu đề: ${changes.title.old} → ${changes.title.new}`)
        }
        if (changes?.published !== undefined) {
          changeDescriptions.push(
            `Trạng thái: ${changes.published.old ? "Đã xuất bản" : "Bản nháp"} → ${changes.published.new ? "Đã xuất bản" : "Bản nháp"}`
          )
        }
        title = "✏️ Bài viết được cập nhật"
        description = `${actorName} đã cập nhật bài viết: ${targetPostTitle}${
          changeDescriptions.length > 0 ? `\nThay đổi: ${changeDescriptions.join(", ")}` : ""
        }`
        break
      case "delete":
        title = "🗑️ Bài viết bị xóa"
        description = `${actorName} đã xóa bài viết: ${targetPostTitle}`
        break
      case "restore":
        title = "♻️ Bài viết được khôi phục"
        description = `${actorName} đã khôi phục bài viết: ${targetPostTitle}`
        break
      case "hard-delete":
        title = "⚠️ Bài viết bị xóa vĩnh viễn"
        description = `${actorName} đã xóa vĩnh viễn bài viết: ${targetPostTitle}`
        break
    }

    const result = await createNotificationForAllAdmins(
      title,
      description,
      actionUrl,
      NotificationKind.SYSTEM,
      {
        type: `post_${action}`,
        actorId,
        actorName: actor?.name || actor?.email,
        actorEmail: actor?.email,
        targetPostId: targetPost.id,
        targetPostTitle,
        targetPostSlug: targetPost.slug,
        changes,
        timestamp: new Date().toISOString(),
      }
    )

    // Emit socket event nếu có socket server
    if (result.count > 0) {
      await emitNotificationToAllAdminsAfterCreate(
        title,
        description,
        actionUrl,
        NotificationKind.SYSTEM,
        {
          type: `post_${action}`,
          actorId,
          actorName: actor?.name || actor?.email,
          actorEmail: actor?.email,
          targetPostId: targetPost.id,
          targetPostTitle,
          targetPostSlug: targetPost.slug,
          changes,
          timestamp: new Date().toISOString(),
        }
      )
    }
  } catch (error) {
    resourceLogger.actionFlow({
      resource: "posts",
      action: action === "create" ? "create" : action === "update" ? "update" : action === "delete" ? "delete" : action === "restore" ? "restore" : "hard-delete",
      step: "error",
      metadata: { postId: targetPost.id, error: error instanceof Error ? error.message : String(error) },
    })
  }
}

export async function notifySuperAdminsOfBulkPostAction(
  action: "delete" | "restore" | "hard-delete",
  actorId: string,
  count: number,
  posts?: Array<{ title: string }>
) {
  const startTime = Date.now()
  
  resourceLogger.actionFlow({
    resource: "posts",
    action: action === "delete" ? "bulk-delete" : action === "restore" ? "bulk-restore" : "bulk-hard-delete",
    step: "start",
    metadata: { count, postCount: posts?.length || 0, actorId },
  })

  try {
    const actor = await getActorInfo(actorId)
    const actorName = actor?.name || actor?.email || "Hệ thống"

    let title = ""
    let description = ""

    // Format post titles - hiển thị tối đa 3 tiêu đề đầu tiên để rút gọn notification
    const titlesText = posts && posts.length > 0 ? formatPostTitles(posts, 3) : ""

    switch (action) {
      case "delete":
        title = "🗑️ Đã xóa nhiều bài viết"
        description = titlesText 
          ? `${actorName} đã xóa ${count} bài viết: ${titlesText}`
          : `${actorName} đã xóa ${count} bài viết`
        break
      case "restore":
        title = "♻️ Đã khôi phục nhiều bài viết"
        description = titlesText
          ? `${actorName} đã khôi phục ${count} bài viết: ${titlesText}`
          : `${actorName} đã khôi phục ${count} bài viết`
        break
      case "hard-delete":
        title = "⚠️ Đã xóa vĩnh viễn nhiều bài viết"
        description = titlesText
          ? `${actorName} đã xóa vĩnh viễn ${count} bài viết: ${titlesText}`
          : `${actorName} đã xóa vĩnh viễn ${count} bài viết`
        break
    }

    const actionUrl = `/admin/posts`

    const result = await createNotificationForAllAdmins(
      title,
      description,
      actionUrl,
      NotificationKind.SYSTEM,
      {
        type: `post_bulk_${action}`,
        actorId,
        actorName: actor?.name || actor?.email,
        actorEmail: actor?.email,
        count,
        postTitles: posts?.map(p => p.title) || [],
        timestamp: new Date().toISOString(),
      }
    )

    // Emit socket event nếu có socket server
    if (result.count > 0) {
      await emitNotificationToAllAdminsAfterCreate(
        title,
        description,
        actionUrl,
        NotificationKind.SYSTEM,
        {
          type: `post_bulk_${action}`,
          actorId,
          actorName: actor?.name || actor?.email,
          actorEmail: actor?.email,
          count,
          postTitles: posts?.map(p => p.title) || [],
          timestamp: new Date().toISOString(),
        }
      )
    }

    resourceLogger.actionFlow({
      resource: "posts",
      action: action === "delete" ? "bulk-delete" : action === "restore" ? "bulk-restore" : "bulk-hard-delete",
      step: "success",
      duration: Date.now() - startTime,
      metadata: { count, postCount: posts?.length || 0 },
    })
  } catch (error) {
    resourceLogger.actionFlow({
      resource: "posts",
      action: action === "delete" ? "bulk-delete" : action === "restore" ? "bulk-restore" : "bulk-hard-delete",
      step: "error",
      metadata: { count, error: error instanceof Error ? error.message : String(error) },
    })
  }
}

