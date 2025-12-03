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

function formatCategoryNames(categories: Array<{ name: string }>, maxNames = 3): string {
  if (!categories || categories.length === 0) return ""
  
  const displayNames = categories.slice(0, maxNames).map(c => `"${c.name}"`)
  const remainingCount = categories.length > maxNames ? categories.length - maxNames : 0
  
  if (remainingCount > 0) {
    return `${displayNames.join(", ")} và ${remainingCount} danh mục khác`
  }
  return displayNames.join(", ")
}

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
    const actor = await getActorInfo(actorId)
    const actorName = actor?.name || actor?.email || "Hệ thống"

    let title = ""
    let description = ""
    const actionUrl = `/admin/categories/${category.id}`

    switch (action) {
      case "create":
        title = "📁 Danh mục mới"
        description = `${actorName} đã tạo "${category.name}"`
        break
      case "update":
        const changeDescriptions: string[] = []
        if (changes?.name) {
          changeDescriptions.push(`${changes.name.old} → ${changes.name.new}`)
        }
        if (changes?.slug) {
          changeDescriptions.push(`Slug: ${changes.slug.old} → ${changes.slug.new}`)
        }
        if (changes?.description) {
          changeDescriptions.push("Mô tả đã thay đổi")
        }
        title = "✏️ Danh mục đã cập nhật"
        description = `${actorName} đã cập nhật "${category.name}"${
          changeDescriptions.length > 0 ? `: ${changeDescriptions.join(", ")}` : ""
        }`
        break
      case "delete":
        title = "🗑️ Danh mục đã xóa"
        description = `${actorName} đã xóa "${category.name}"`
        break
      case "restore":
        title = "♻️ Danh mục đã khôi phục"
        description = `${actorName} đã khôi phục "${category.name}"`
        break
      case "hard-delete":
        title = "⚠️ Danh mục đã xóa vĩnh viễn"
        description = `${actorName} đã xóa vĩnh viễn "${category.name}"`
        break
    }

    // Tạo notifications trong DB cho tất cả admin
    const result = await createNotificationForAllAdmins(
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

    // Emit socket event nếu có socket server
    if (result.count > 0) {
      await emitNotificationToAllAdminsAfterCreate(
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
    }
  } catch (error) {
    // Log error nhưng không throw để không ảnh hưởng đến main operation
    resourceLogger.actionFlow({
      resource: "categories",
      action: action === "create" ? "create" : action === "update" ? "update" : action === "delete" ? "delete" : action === "restore" ? "restore" : "hard-delete",
      step: "error",
      metadata: { categoryId: category.id, error: error instanceof Error ? error.message : String(error) },
    })
  }
}

export async function notifySuperAdminsOfBulkCategoryAction(
  action: "delete" | "restore" | "hard-delete",
  actorId: string,
  count: number,
  categories?: Array<{ name: string }>
) {
  const startTime = Date.now()
  
  resourceLogger.actionFlow({
    resource: "categories",
    action: action === "delete" ? "bulk-delete" : action === "restore" ? "bulk-restore" : "bulk-hard-delete",
    step: "start",
    metadata: { count, categoryCount: categories?.length || 0, actorId },
  })

  try {
    const actor = await getActorInfo(actorId)
    const actorName = actor?.name || actor?.email || "Hệ thống"

    let title = ""
    let description = ""

    // Format category names - hiển thị tối đa 3 tên đầu tiên để rút gọn notification
    const namesText = categories && categories.length > 0 ? formatCategoryNames(categories, 3) : ""

    switch (action) {
      case "delete":
        title = "🗑️ Nhiều danh mục đã xóa"
        description = namesText 
          ? `${actorName} đã xóa ${count} danh mục: ${namesText}`
          : `${actorName} đã xóa ${count} danh mục`
        break
      case "restore":
        title = "♻️ Nhiều danh mục đã khôi phục"
        description = namesText
          ? `${actorName} đã khôi phục ${count} danh mục: ${namesText}`
          : `${actorName} đã khôi phục ${count} danh mục`
        break
      case "hard-delete":
        title = "⚠️ Nhiều danh mục đã xóa vĩnh viễn"
        description = namesText
          ? `${actorName} đã xóa vĩnh viễn ${count} danh mục: ${namesText}`
          : `${actorName} đã xóa vĩnh viễn ${count} danh mục`
        break
    }

    const actionUrl = `/admin/categories`

    const result = await createNotificationForAllAdmins(
      title,
      description,
      actionUrl,
      NotificationKind.SYSTEM,
      {
        type: `category_bulk_${action}`,
        actorId,
        actorName: actor?.name || actor?.email,
        actorEmail: actor?.email,
        count,
        categoryNames: categories?.map(c => c.name) || [],
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
          type: `category_bulk_${action}`,
          actorId,
          actorName: actor?.name || actor?.email,
          actorEmail: actor?.email,
          count,
          categoryNames: categories?.map(c => c.name) || [],
          timestamp: new Date().toISOString(),
        }
      )
    }

    resourceLogger.actionFlow({
      resource: "categories",
      action: action === "delete" ? "bulk-delete" : action === "restore" ? "bulk-restore" : "bulk-hard-delete",
      step: "success",
      duration: Date.now() - startTime,
      metadata: { count, categoryCount: categories?.length || 0 },
    })
  } catch (error) {
    resourceLogger.actionFlow({
      resource: "categories",
      action: action === "delete" ? "bulk-delete" : action === "restore" ? "bulk-restore" : "bulk-hard-delete",
      step: "error",
      metadata: { count, error: error instanceof Error ? error.message : String(error) },
    })
  }
}

