"use server"

import type { Prisma } from "@prisma/client"
import { PERMISSIONS, canPerformAnyAction } from "@/lib/permissions"
import { prisma } from "@/lib/database"
import { logger } from "@/lib/config"
import { mapCategoryRecord, type CategoryWithRelations } from "./helpers"
import type { ListedCategory } from "../types"
import { generateSlug } from "../utils"
import type { BulkActionResult } from "../types"
import {
  CreateCategorySchema,
  UpdateCategorySchema,
} from "./schemas"
import { notifySuperAdminsOfCategoryAction } from "./notifications"
import { emitCategoryUpsert, emitCategoryRemove } from "./events"
import {
  ApplicationError,
  ForbiddenError,
  NotFoundError,
  ensurePermission,
  invalidateResourceCache,
  invalidateResourceCacheBulk,
  type AuthContext,
} from "@/features/admin/resources/server"
import { z } from "zod"

// Re-export for backward compatibility with API routes
export { ApplicationError, ForbiddenError, NotFoundError, type AuthContext }

function sanitizeCategory(category: CategoryWithRelations): ListedCategory {
  return mapCategoryRecord(category)
}

export async function createCategory(ctx: AuthContext, input: z.infer<typeof CreateCategorySchema>): Promise<ListedCategory> {
  ensurePermission(ctx, PERMISSIONS.CATEGORIES_CREATE, PERMISSIONS.CATEGORIES_MANAGE)

  // Validate input với zod
  const validatedInput = CreateCategorySchema.parse(input)

  const trimmedName = validatedInput.name.trim()
  // Generate slug if not provided
  const slug = validatedInput.slug?.trim() || generateSlug(trimmedName)

  // Check if name or slug already exists
  const existing = await prisma.category.findFirst({
    where: {
      OR: [
        { name: trimmedName },
        { slug: slug },
      ],
      deletedAt: null,
    },
  })

  if (existing) {
    if (existing.name === trimmedName) {
      throw new ApplicationError("Tên danh mục đã tồn tại", 400)
    }
    if (existing.slug === slug) {
      throw new ApplicationError("Slug đã tồn tại", 400)
    }
  }

  const category = await prisma.category.create({
    data: {
      name: trimmedName,
      slug: slug,
      description: validatedInput.description?.trim() || null,
    },
  })

  const sanitized = sanitizeCategory(category)

  // Emit socket event for real-time updates
  await emitCategoryUpsert(sanitized.id, null)

  // Emit notification realtime
  await notifySuperAdminsOfCategoryAction(
    "create",
    ctx.actorId,
    {
      id: sanitized.id,
      name: sanitized.name,
      slug: sanitized.slug,
    }
  )

  // Invalidate cache
  await invalidateResourceCache({
    resource: "categories",
    id: sanitized.id,
    additionalTags: ["category-options", "active-categories"],
  })

  return sanitized
}

export async function updateCategory(ctx: AuthContext, id: string, input: z.infer<typeof UpdateCategorySchema>): Promise<ListedCategory> {
  ensurePermission(ctx, PERMISSIONS.CATEGORIES_UPDATE, PERMISSIONS.CATEGORIES_MANAGE)

  if (!id || typeof id !== "string" || id.trim() === "") {
    throw new ApplicationError("ID danh mục không hợp lệ", 400)
  }

  // Validate input với zod
  const validatedInput = UpdateCategorySchema.parse(input)

  const existing = await prisma.category.findUnique({
    where: { id },
  })

  if (!existing || existing.deletedAt) {
    throw new NotFoundError("Danh mục không tồn tại")
  }

  // Track changes for notification
  const changes: {
    name?: { old: string; new: string }
    slug?: { old: string; new: string }
    description?: { old: string | null; new: string | null }
  } = {}

  const updateData: Prisma.CategoryUpdateInput = {}

  if (validatedInput.name !== undefined) {
    const trimmedName = validatedInput.name.trim()
    // Check if name is already used by another category
    if (trimmedName !== existing.name) {
      const nameExists = await prisma.category.findFirst({
        where: {
          name: trimmedName,
          deletedAt: null,
          id: { not: id },
        },
      })
      if (nameExists) {
        throw new ApplicationError("Tên danh mục đã được sử dụng", 400)
      }
      changes.name = { old: existing.name, new: trimmedName }
    }
    updateData.name = trimmedName
  }

  if (validatedInput.slug !== undefined) {
    const trimmedSlug = validatedInput.slug.trim()
    // Check if slug is already used by another category
    if (trimmedSlug !== existing.slug) {
      const slugExists = await prisma.category.findFirst({
        where: {
          slug: trimmedSlug,
          deletedAt: null,
          id: { not: id },
        },
      })
      if (slugExists) {
        throw new ApplicationError("Slug đã được sử dụng", 400)
      }
      changes.slug = { old: existing.slug, new: trimmedSlug }
    }
    updateData.slug = trimmedSlug
  }

  if (validatedInput.description !== undefined) {
    const trimmedDescription = validatedInput.description?.trim() || null
    if (trimmedDescription !== existing.description) {
      changes.description = { old: existing.description, new: trimmedDescription }
    }
    updateData.description = trimmedDescription
  }

  const category = await prisma.category.update({
    where: { id },
    data: updateData,
  })

  const sanitized = sanitizeCategory(category)

  // Emit socket event for real-time updates
  const previousStatus: "active" | "deleted" = existing.deletedAt ? "deleted" : "active"
  await emitCategoryUpsert(sanitized.id, previousStatus)

  // Emit notification realtime
  await notifySuperAdminsOfCategoryAction(
    "update",
    ctx.actorId,
    {
      id: sanitized.id,
      name: sanitized.name,
      slug: sanitized.slug,
    },
    Object.keys(changes).length > 0 ? changes : undefined
  )

  // Invalidate cache - QUAN TRỌNG: phải invalidate detail page để cập nhật ngay
  await invalidateResourceCache({
    resource: "categories",
    id,
    additionalTags: ["category-options", "active-categories"],
  })

  return sanitized
}

export async function softDeleteCategory(ctx: AuthContext, id: string): Promise<void> {
  ensurePermission(ctx, PERMISSIONS.CATEGORIES_DELETE, PERMISSIONS.CATEGORIES_MANAGE)

  const category = await prisma.category.findUnique({ where: { id } })
  if (!category || category.deletedAt) {
    throw new NotFoundError("Danh mục không tồn tại")
  }

  await prisma.category.update({
    where: { id },
    data: {
      deletedAt: new Date(),
    },
  })

  // Emit socket event for real-time updates
  await emitCategoryUpsert(id, "active")

  // Emit notification realtime
  await notifySuperAdminsOfCategoryAction(
    "delete",
    ctx.actorId,
    {
      id: category.id,
      name: category.name,
      slug: category.slug,
    }
  )

  // Invalidate cache
  await invalidateResourceCache({
    resource: "categories",
    id,
    additionalTags: ["category-options", "active-categories"],
  })
}

export async function bulkSoftDeleteCategories(ctx: AuthContext, ids: string[]): Promise<BulkActionResult> {
  ensurePermission(ctx, PERMISSIONS.CATEGORIES_DELETE, PERMISSIONS.CATEGORIES_MANAGE)

  if (!ids || ids.length === 0) {
    throw new ApplicationError("Danh sách danh mục trống", 400)
  }

  // Lấy thông tin categories trước khi delete để tạo notifications
  // Chỉ tìm các categories đang hoạt động (chưa bị xóa)
  const categories = await prisma.category.findMany({
    where: {
      id: { in: ids },
      deletedAt: null,
    },
    select: { id: true, name: true, slug: true },
  })

  // Nếu không tìm thấy category nào, có thể chúng đã bị xóa rồi hoặc không tồn tại
  if (categories.length === 0) {
    // Kiểm tra xem có categories nào đã bị soft delete không
    const deletedCategories = await prisma.category.findMany({
      where: {
        id: { in: ids },
        deletedAt: { not: null },
      },
      select: { id: true },
    })

    if (deletedCategories.length > 0) {
      return { 
        success: true, 
        message: `Không có danh mục nào để xóa (${deletedCategories.length} danh mục đã bị xóa, ${ids.length - deletedCategories.length} danh mục không tồn tại)`, 
        affected: 0 
      }
    }

    return { 
      success: true, 
      message: `Không tìm thấy danh mục nào để xóa (có thể đã bị xóa vĩnh viễn)`, 
      affected: 0 
    }
  }

  const result = await prisma.category.updateMany({
    where: {
      id: { in: categories.map(c => c.id) },
      deletedAt: null,
    },
    data: {
      deletedAt: new Date(),
    },
  })

  // Invalidate cache cho bulk operation
  await invalidateResourceCacheBulk({
    resource: "categories",
    additionalTags: ["category-options", "active-categories"],
  })

  // Emit socket events để update UI - await song song để đảm bảo tất cả events được emit
  // Sử dụng Promise.allSettled để không bị fail nếu một event lỗi
  if (result.count > 0) {
    // Emit events song song và await tất cả để đảm bảo hoàn thành
    const emitPromises = categories.map((category) => 
      emitCategoryUpsert(category.id, "active").catch((error) => {
        logger.error(`Failed to emit category:upsert for ${category.id}`, error as Error)
        return null // Return null để Promise.allSettled không throw
      })
    )
    // Await tất cả events nhưng không fail nếu một số lỗi
    await Promise.allSettled(emitPromises)

    // Tạo system notifications cho từng category
    for (const category of categories) {
      await notifySuperAdminsOfCategoryAction(
        "delete",
        ctx.actorId,
        category
      )
    }
  }

  return { success: true, message: `Đã xóa ${result.count} danh mục`, affected: result.count }
}

export async function restoreCategory(ctx: AuthContext, id: string): Promise<void> {
  ensurePermission(ctx, PERMISSIONS.CATEGORIES_UPDATE, PERMISSIONS.CATEGORIES_MANAGE)

  const category = await prisma.category.findUnique({ where: { id } })
  if (!category || !category.deletedAt) {
    throw new NotFoundError("Danh mục không tồn tại hoặc chưa bị xóa")
  }

  await prisma.category.update({
    where: { id },
    data: {
      deletedAt: null,
    },
  })

  // Emit socket event for real-time updates
  await emitCategoryUpsert(id, "deleted")

  // Emit notification realtime
  await notifySuperAdminsOfCategoryAction(
    "restore",
    ctx.actorId,
    {
      id: category.id,
      name: category.name,
      slug: category.slug,
    }
  )

  // Invalidate cache
  await invalidateResourceCache({
    resource: "categories",
    id,
    additionalTags: ["category-options", "active-categories"],
  })
}

export async function bulkRestoreCategories(ctx: AuthContext, ids: string[]): Promise<BulkActionResult> {
  ensurePermission(ctx, PERMISSIONS.CATEGORIES_UPDATE, PERMISSIONS.CATEGORIES_MANAGE)

  if (!ids || ids.length === 0) {
    throw new ApplicationError("Danh sách danh mục trống", 400)
  }

  // Tìm tất cả categories được request để phân loại trạng thái
  // Prisma findMany mặc định KHÔNG filter theo deletedAt, nên sẽ tìm thấy cả soft-deleted và active categories
  // Nhưng KHÔNG tìm thấy hard-deleted categories (đã bị xóa vĩnh viễn khỏi database)
  // Sử dụng findMany mà KHÔNG filter theo deletedAt để tìm được tất cả categories (kể cả đã bị soft delete)
  const allRequestedCategories = await prisma.category.findMany({
    where: {
      id: { in: ids },
      // KHÔNG filter theo deletedAt ở đây để tìm được cả soft-deleted và active categories
    },
    select: { id: true, name: true, slug: true, deletedAt: true },
  })

  // Phân loại categories
  const softDeletedCategories = allRequestedCategories.filter((c) => c.deletedAt !== null)
  const activeCategories = allRequestedCategories.filter((c) => c.deletedAt === null)
  const notFoundCount = ids.length - allRequestedCategories.length

  // Nếu không có category nào đã bị soft delete, trả về message chi tiết
  if (softDeletedCategories.length === 0) {
    const parts: string[] = []
    if (activeCategories.length > 0) {
      parts.push(`${activeCategories.length} danh mục đang hoạt động`)
    }
    if (notFoundCount > 0) {
      parts.push(`${notFoundCount} danh mục không tồn tại (đã bị xóa vĩnh viễn)`)
    }

    const message = parts.length > 0
      ? `Không có danh mục nào để khôi phục (${parts.join(", ")})`
      : `Không tìm thấy danh mục nào để khôi phục`

    return { 
      success: true, 
      message, 
      affected: 0 
    }
  }

  // Chỉ restore những categories đã bị soft delete
  const categoriesToRestore = softDeletedCategories

  const result = await prisma.category.updateMany({
    where: {
      id: { in: categoriesToRestore.map(c => c.id) },
      deletedAt: { not: null },
    },
    data: {
      deletedAt: null,
    },
  })

  // Invalidate cache cho bulk operation
  await invalidateResourceCacheBulk({
    resource: "categories",
    additionalTags: ["category-options", "active-categories"],
  })

  // Emit socket events để update UI - await song song để đảm bảo tất cả events được emit
  // Sử dụng Promise.allSettled để không bị fail nếu một event lỗi
  if (result.count > 0) {
    // Emit events song song và await tất cả để đảm bảo hoàn thành
    const emitPromises = categoriesToRestore.map((category) => 
      emitCategoryUpsert(category.id, "deleted").catch((error) => {
        logger.error(`Failed to emit category:upsert for ${category.id}`, error as Error)
        return null // Return null để Promise.allSettled không throw
      })
    )
    // Await tất cả events nhưng không fail nếu một số lỗi
    await Promise.allSettled(emitPromises)

    // Tạo system notifications cho từng category
    for (const category of categoriesToRestore) {
      await notifySuperAdminsOfCategoryAction(
        "restore",
        ctx.actorId,
        category
      )
    }
  }

  // Tạo message chi tiết nếu có categories không thể restore
  let message = `Đã khôi phục ${result.count} danh mục`
  if (result.count < ids.length) {
    const skippedCount = ids.length - result.count
    const skippedParts: string[] = []
    if (activeCategories.length > 0) {
      skippedParts.push(`${activeCategories.length} danh mục đang hoạt động`)
    }
    if (notFoundCount > 0) {
      skippedParts.push(`${notFoundCount} danh mục đã bị xóa vĩnh viễn`)
    }
    if (skippedParts.length > 0) {
      message += ` (${skippedCount} danh mục không thể khôi phục: ${skippedParts.join(", ")})`
    }
  }

  return { success: true, message, affected: result.count }
}

export async function hardDeleteCategory(ctx: AuthContext, id: string): Promise<void> {
  if (!canPerformAnyAction(ctx.permissions, ctx.roles, [PERMISSIONS.CATEGORIES_MANAGE])) {
    throw new ForbiddenError()
  }

  const category = await prisma.category.findUnique({
    where: { id },
    select: { id: true, name: true, slug: true, deletedAt: true },
  })

  if (!category) {
    throw new NotFoundError("Danh mục không tồn tại")
  }

  const previousStatus: "active" | "deleted" = category.deletedAt ? "deleted" : "active"
  
  await prisma.category.delete({
    where: { id },
  })

  // Emit socket event for real-time updates
  emitCategoryRemove(id, previousStatus)

  // Emit notification realtime
  await notifySuperAdminsOfCategoryAction(
    "hard-delete",
    ctx.actorId,
    category
  )

  // Invalidate cache
  await invalidateResourceCache({
    resource: "categories",
    id,
    additionalTags: ["category-options", "active-categories"],
  })
}

export async function bulkHardDeleteCategories(ctx: AuthContext, ids: string[]): Promise<BulkActionResult> {
  if (!canPerformAnyAction(ctx.permissions, ctx.roles, [PERMISSIONS.CATEGORIES_MANAGE])) {
    throw new ForbiddenError()
  }

  if (!ids || ids.length === 0) {
    throw new ApplicationError("Danh sách danh mục trống", 400)
  }

  // Lấy thông tin categories trước khi delete để tạo notifications và socket events
  const categories = await prisma.category.findMany({
    where: {
      id: { in: ids },
    },
    select: { id: true, name: true, slug: true, deletedAt: true },
  })

  const result = await prisma.category.deleteMany({
    where: {
      id: { in: ids },
    },
  })

  // Emit socket events để update UI - fire and forget để tránh timeout
  // Emit song song cho tất cả categories đã bị hard delete
  if (result.count > 0) {
    // Emit events (emitCategoryRemove trả về void, không phải Promise)
    categories.forEach((category) => {
      const previousStatus: "active" | "deleted" = category.deletedAt ? "deleted" : "active"
      try {
        emitCategoryRemove(category.id, previousStatus)
      } catch (error) {
        logger.error(`Failed to emit category:remove for ${category.id}`, error as Error)
      }
    })

    // Tạo system notifications cho từng category
    for (const category of categories) {
      await notifySuperAdminsOfCategoryAction(
        "hard-delete",
        ctx.actorId,
        category
      )
    }
  }

  // Invalidate cache cho bulk operation
  await invalidateResourceCacheBulk({
    resource: "categories",
    additionalTags: ["category-options", "active-categories"],
  })

  return { success: true, message: `Đã xóa vĩnh viễn ${result.count} danh mục${result.count < categories.length ? ` (${categories.length - result.count} danh mục không tồn tại)` : ""}`, affected: result.count }
}
