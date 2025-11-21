"use server"

import type { Prisma } from "@prisma/client"
import { revalidatePath, revalidateTag } from "next/cache"
import { PERMISSIONS, canPerformAnyAction } from "@/lib/permissions"
import { prisma } from "@/lib/database"
import { logger } from "@/lib/config"
import { mapTagRecord, type TagWithRelations } from "./helpers"
import type { ListedTag } from "../types"
import { generateSlug } from "../utils"
import type { BulkActionResult } from "../types"
import {
  CreateTagSchema,
  UpdateTagSchema,
  type CreateTagInput,
  type UpdateTagInput,
} from "./schemas"
import { notifySuperAdminsOfTagAction } from "./notifications"
import {
  ApplicationError,
  ForbiddenError,
  NotFoundError,
  ensurePermission,
  type AuthContext,
} from "@/features/admin/resources/server"
import { emitTagUpsert, emitTagRemove } from "./events"

// Re-export for backward compatibility with API routes
export { ApplicationError, ForbiddenError, NotFoundError, type AuthContext }

function sanitizeTag(tag: TagWithRelations): ListedTag {
  return mapTagRecord(tag)
}

export async function createTag(ctx: AuthContext, input: CreateTagInput): Promise<ListedTag> {
  ensurePermission(ctx, PERMISSIONS.TAGS_CREATE, PERMISSIONS.TAGS_MANAGE)

  // Validate input với zod
  const validatedInput = CreateTagSchema.parse(input)

  const trimmedName = validatedInput.name.trim()
  // Generate slug if not provided
  const slug = validatedInput.slug?.trim() || generateSlug(trimmedName)

  // Check if name or slug already exists
  const existing = await prisma.tag.findFirst({
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
      throw new ApplicationError("Tên thẻ tag đã tồn tại", 400)
    }
    if (existing.slug === slug) {
      throw new ApplicationError("Slug đã tồn tại", 400)
    }
  }

  const tag = await prisma.tag.create({
    data: {
      name: trimmedName,
      slug: slug,
    },
  })

  const sanitized = sanitizeTag(tag)

  // Revalidate cache để cập nhật danh sách tags
  revalidatePath("/admin/tags", "page")
  revalidatePath("/admin/tags", "layout")
  // Invalidate unstable_cache với tất cả tags liên quan
  await revalidateTag("tags", {})
  await revalidateTag("tag-options", {})
  await revalidateTag("active-tags", {})

  // Emit socket event for real-time updates
  await emitTagUpsert(sanitized.id, null)

  // Emit notification realtime
  await notifySuperAdminsOfTagAction(
    "create",
    ctx.actorId,
    {
      id: sanitized.id,
      name: sanitized.name,
      slug: sanitized.slug,
    }
  )

  return sanitized
}

export async function updateTag(ctx: AuthContext, id: string, input: UpdateTagInput): Promise<ListedTag> {
  ensurePermission(ctx, PERMISSIONS.TAGS_UPDATE, PERMISSIONS.TAGS_MANAGE)

  if (!id || typeof id !== "string" || id.trim() === "") {
    throw new ApplicationError("ID thẻ tag không hợp lệ", 400)
  }

  // Validate input với zod
  const validatedInput = UpdateTagSchema.parse(input)

  const existing = await prisma.tag.findUnique({
    where: { id },
  })

  if (!existing || existing.deletedAt) {
    throw new NotFoundError("Thẻ tag không tồn tại")
  }

  // Track changes for notification
  const changes: {
    name?: { old: string; new: string }
    slug?: { old: string; new: string }
  } = {}

  const updateData: Prisma.TagUpdateInput = {}

  if (validatedInput.name !== undefined) {
    const trimmedName = validatedInput.name.trim()
    // Check if name is already used by another tag
    if (trimmedName !== existing.name) {
      const nameExists = await prisma.tag.findFirst({
        where: {
          name: trimmedName,
          deletedAt: null,
          id: { not: id },
        },
      })
      if (nameExists) {
        throw new ApplicationError("Tên thẻ tag đã được sử dụng", 400)
      }
      changes.name = { old: existing.name, new: trimmedName }
    }
    updateData.name = trimmedName
  }

  if (validatedInput.slug !== undefined) {
    const trimmedSlug = validatedInput.slug.trim()
    // Check if slug is already used by another tag
    if (trimmedSlug !== existing.slug) {
      const slugExists = await prisma.tag.findFirst({
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

  const tag = await prisma.tag.update({
    where: { id },
    data: updateData,
  })

  const sanitized = sanitizeTag(tag)

  // Revalidate cache để cập nhật danh sách tags
  revalidatePath("/admin/tags", "page")
  revalidatePath("/admin/tags", "layout")
  revalidatePath(`/admin/tags/${id}`, "page")
  // Invalidate unstable_cache với tất cả tags liên quan
  await revalidateTag("tags", {})
  await revalidateTag(`tag-${id}`, {})
  await revalidateTag("tag-options", {})
  await revalidateTag("active-tags", {})

  // Determine previous status for socket event
  const previousStatus: "active" | "deleted" | null = existing.deletedAt ? "deleted" : "active"

  // Emit socket event for real-time updates
  await emitTagUpsert(sanitized.id, previousStatus)

  // Emit notification realtime
  await notifySuperAdminsOfTagAction(
    "update",
    ctx.actorId,
    {
      id: sanitized.id,
      name: sanitized.name,
      slug: sanitized.slug,
    },
    Object.keys(changes).length > 0 ? changes : undefined
  )

  return sanitized
}

export async function softDeleteTag(ctx: AuthContext, id: string): Promise<void> {
  ensurePermission(ctx, PERMISSIONS.TAGS_DELETE, PERMISSIONS.TAGS_MANAGE)

  const tag = await prisma.tag.findUnique({ where: { id } })
  if (!tag || tag.deletedAt) {
    throw new NotFoundError("Thẻ tag không tồn tại")
  }

  await prisma.tag.update({
    where: { id },
    data: {
      deletedAt: new Date(),
    },
  })

  // Revalidate cache để cập nhật danh sách tags
  revalidatePath("/admin/tags", "page")
  revalidatePath("/admin/tags", "layout")
  // Invalidate unstable_cache với tất cả tags liên quan
  await revalidateTag("tags", {})
  await revalidateTag("tag-options", {})
  await revalidateTag("active-tags", {})

  // Emit socket event for real-time updates
  await emitTagUpsert(id, "active")

  // Emit notification realtime
  await notifySuperAdminsOfTagAction(
    "delete",
    ctx.actorId,
    {
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
    }
  )
}

export async function bulkSoftDeleteTags(ctx: AuthContext, ids: string[]): Promise<BulkActionResult> {
  ensurePermission(ctx, PERMISSIONS.TAGS_DELETE, PERMISSIONS.TAGS_MANAGE)

  if (!ids || ids.length === 0) {
    throw new ApplicationError("Danh sách thẻ tag trống", 400)
  }

  // Lấy thông tin tags trước khi delete để tạo notifications
  // Chỉ tìm các tags đang hoạt động (chưa bị xóa)
  const tags = await prisma.tag.findMany({
    where: {
      id: { in: ids },
      deletedAt: null,
    },
    select: { id: true, name: true, slug: true },
  })

  // Nếu không tìm thấy tag nào, có thể chúng đã bị xóa rồi hoặc không tồn tại
  if (tags.length === 0) {
    // Kiểm tra xem có tags nào đã bị soft delete không
    const deletedTags = await prisma.tag.findMany({
      where: {
        id: { in: ids },
        deletedAt: { not: null },
      },
      select: { id: true },
    })

    if (deletedTags.length > 0) {
      return { 
        success: true, 
        message: `Không có thẻ tag nào để xóa (${deletedTags.length} tag đã bị xóa, ${ids.length - deletedTags.length} tag không tồn tại)`, 
        affected: 0 
      }
    }

    return { 
      success: true, 
      message: `Không tìm thấy thẻ tag nào để xóa (có thể đã bị xóa vĩnh viễn)`, 
      affected: 0 
    }
  }

  // Log để debug
  logger.debug("bulkSoftDeleteTags: Found tags to delete", {
    found: tags.length,
    requested: ids.length,
  })

  const result = await prisma.tag.updateMany({
    where: {
      id: { in: tags.map((tag) => tag.id) }, // Chỉ xóa những tags thực sự tồn tại và đang hoạt động
      deletedAt: null,
    },
    data: {
      deletedAt: new Date(),
    },
  })

  // Log để debug
  logger.debug("bulkSoftDeleteTags: Deleted tags", {
    deleted: result.count,
    found: tags.length,
  })

  // Revalidate cache để cập nhật danh sách tags
  revalidatePath("/admin/tags", "page")
  revalidatePath("/admin/tags", "layout")
  // Invalidate unstable_cache với tất cả tags liên quan
  await revalidateTag("tags", {})
  await revalidateTag("tag-options", {})
  await revalidateTag("active-tags", {})

  // Emit socket events để update UI - await song song để đảm bảo tất cả events được emit
  // Sử dụng Promise.allSettled để không bị fail nếu một event lỗi
  if (result.count > 0) {
    // Emit events song song và await tất cả để đảm bảo hoàn thành
    const emitPromises = tags.map((tag) => 
      emitTagUpsert(tag.id, "active").catch((error) => {
        logger.error(`Failed to emit tag:upsert for ${tag.id}`, error as Error)
        return null // Return null để Promise.allSettled không throw
      })
    )
    // Await tất cả events nhưng không fail nếu một số lỗi
    await Promise.allSettled(emitPromises)

    // Tạo system notifications cho từng tag
    for (const tag of tags) {
      await notifySuperAdminsOfTagAction(
        "delete",
        ctx.actorId,
        tag
      )
    }
  }

  return { success: true, message: `Đã xóa ${result.count} thẻ tag`, affected: result.count }
}

export async function restoreTag(ctx: AuthContext, id: string): Promise<void> {
  ensurePermission(ctx, PERMISSIONS.TAGS_UPDATE, PERMISSIONS.TAGS_MANAGE)

  const tag = await prisma.tag.findUnique({ where: { id } })
  if (!tag || !tag.deletedAt) {
    throw new NotFoundError("Thẻ tag không tồn tại hoặc chưa bị xóa")
  }

  await prisma.tag.update({
    where: { id },
    data: {
      deletedAt: null,
    },
  })

  // Revalidate cache để cập nhật danh sách tags
  revalidatePath("/admin/tags", "page")
  revalidatePath("/admin/tags", "layout")
  // Invalidate unstable_cache với tất cả tags liên quan
  await revalidateTag("tags", {})
  await revalidateTag("tag-options", {})
  await revalidateTag("active-tags", {})

  // Emit socket event for real-time updates
  await emitTagUpsert(id, "deleted")

  // Emit notification realtime
  await notifySuperAdminsOfTagAction(
    "restore",
    ctx.actorId,
    {
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
    }
  )
}

export async function bulkRestoreTags(ctx: AuthContext, ids: string[]): Promise<BulkActionResult> {
  ensurePermission(ctx, PERMISSIONS.TAGS_UPDATE, PERMISSIONS.TAGS_MANAGE)

  if (!ids || ids.length === 0) {
    throw new ApplicationError("Danh sách thẻ tag trống", 400)
  }

  // Tìm tất cả tags được request để phân loại trạng thái
  // Prisma findMany mặc định KHÔNG filter theo deletedAt, nên sẽ tìm thấy cả soft-deleted và active tags
  // Nhưng KHÔNG tìm thấy hard-deleted tags (đã bị xóa vĩnh viễn khỏi database)
  // Sử dụng findMany mà KHÔNG filter theo deletedAt để tìm được tất cả tags (kể cả đã bị soft delete)
  const allRequestedTags = await prisma.tag.findMany({
    where: {
      id: { in: ids },
      // KHÔNG filter theo deletedAt ở đây để tìm được cả soft-deleted và active tags
      // Nếu chỉ muốn tìm soft-deleted, dùng: deletedAt: { not: null }
      // Nếu chỉ muốn tìm active, dùng: deletedAt: null
      // Ở đây KHÔNG filter để tìm được tất cả
    },
    select: { id: true, name: true, slug: true, deletedAt: true, createdAt: true },
  })
  
  // Log để debug nếu không tìm thấy tags
  if (allRequestedTags.length === 0) {
    logger.warn("bulkRestoreTags: No tags found in database", {
      requestedIds: ids,
      totalRequested: ids.length,
    })
  }

  // Phân loại tags
  const softDeletedTags = allRequestedTags.filter((tag) => tag.deletedAt !== null)
  const activeTags = allRequestedTags.filter((tag) => tag.deletedAt === null)
  const notFoundCount = ids.length - allRequestedTags.length

  // Log chi tiết để debug
  logger.debug("bulkRestoreTags: Tag status analysis", {
    requested: ids.length,
    found: allRequestedTags.length,
    softDeleted: softDeletedTags.length,
    active: activeTags.length,
    notFound: notFoundCount,
    requestedIds: ids,
    foundIds: allRequestedTags.map((t) => t.id),
    softDeletedIds: softDeletedTags.map((t) => t.id),
    activeIds: activeTags.map((t) => t.id),
    softDeletedDetails: softDeletedTags.map((t) => ({
      id: t.id,
      name: t.name,
      deletedAt: t.deletedAt,
      createdAt: t.createdAt,
    })),
  })

  // Nếu không có tag nào đã bị soft delete, trả về message chi tiết
  if (softDeletedTags.length === 0) {
    const parts: string[] = []
    if (activeTags.length > 0) {
      parts.push(`${activeTags.length} tag đang hoạt động`)
    }
    if (notFoundCount > 0) {
      parts.push(`${notFoundCount} tag không tồn tại (đã bị xóa vĩnh viễn)`)
    }

    const message = parts.length > 0
      ? `Không có thẻ tag nào để khôi phục (${parts.join(", ")})`
      : `Không tìm thấy thẻ tag nào để khôi phục`

    return { 
      success: true, 
      message, 
      affected: 0 
    }
  }

  // Chỉ restore những tags đã bị soft delete
  const tagsToRestore = softDeletedTags

  // Log để debug
  logger.debug("bulkRestoreTags: Restoring tags", {
    toRestore: tagsToRestore.length,
    requested: ids.length,
    tagsToRestoreIds: tagsToRestore.map((t) => t.id),
  })

  // Chỉ update những tags có ID trong danh sách tags đã bị soft delete
  const result = await prisma.tag.updateMany({
    where: {
      id: { in: tagsToRestore.map((tag) => tag.id) }, // Chỉ restore những tags đã bị soft delete
      deletedAt: { not: null }, // Đảm bảo chỉ restore những tags đã bị soft delete
    },
    data: {
      deletedAt: null,
    },
  })

  // Log để debug
  logger.debug("bulkRestoreTags: Restore completed", {
    restored: result.count,
    expected: tagsToRestore.length,
    tagsToRestoreIds: tagsToRestore.map((t) => t.id),
  })

  // Revalidate cache để cập nhật danh sách tags
  revalidatePath("/admin/tags", "page")
  revalidatePath("/admin/tags", "layout")
  // Invalidate unstable_cache với tất cả tags liên quan
  await revalidateTag("tags", {})
  await revalidateTag("tag-options", {})
  await revalidateTag("active-tags", {})

  // Emit socket events để update UI - await song song để đảm bảo tất cả events được emit
  // Sử dụng Promise.allSettled để không bị fail nếu một event lỗi
  if (result.count > 0) {
    // Emit events song song và await tất cả để đảm bảo hoàn thành
    const emitPromises = tagsToRestore.map((tag) => 
      emitTagUpsert(tag.id, "deleted").catch((error) => {
        logger.error(`Failed to emit tag:upsert for ${tag.id}`, error as Error)
        return null // Return null để Promise.allSettled không throw
      })
    )
    // Await tất cả events nhưng không fail nếu một số lỗi
    await Promise.allSettled(emitPromises)

    // Tạo system notifications cho từng tag đã được restore
    for (const tag of tagsToRestore) {
      await notifySuperAdminsOfTagAction(
        "restore",
        ctx.actorId,
        tag
      )
    }
  }

  // Tạo message chi tiết nếu có tags không thể restore
  let message = `Đã khôi phục ${result.count} thẻ tag`
  if (result.count < ids.length) {
    const skippedCount = ids.length - result.count
    const skippedParts: string[] = []
    if (activeTags.length > 0) {
      skippedParts.push(`${activeTags.length} tag đang hoạt động`)
    }
    if (notFoundCount > 0) {
      skippedParts.push(`${notFoundCount} tag đã bị xóa vĩnh viễn`)
    }
    if (skippedParts.length > 0) {
      message += ` (${skippedCount} tag không thể khôi phục: ${skippedParts.join(", ")})`
    }
  }

  return { success: true, message, affected: result.count }
}

export async function hardDeleteTag(ctx: AuthContext, id: string): Promise<void> {
  if (!canPerformAnyAction(ctx.permissions, ctx.roles, [PERMISSIONS.TAGS_MANAGE])) {
    throw new ForbiddenError()
  }

  const tag = await prisma.tag.findUnique({
    where: { id },
    select: { id: true, name: true, slug: true, deletedAt: true },
  })

  if (!tag) {
    throw new NotFoundError("Thẻ tag không tồn tại")
  }

  // Determine previous status before deletion
  const previousStatus: "active" | "deleted" = tag.deletedAt ? "deleted" : "active"

  await prisma.tag.delete({
    where: { id },
  })

  // Revalidate cache để cập nhật danh sách tags
  revalidatePath("/admin/tags", "page")
  revalidatePath("/admin/tags", "layout")
  // Invalidate unstable_cache với tag 'tags' và tag cụ thể
  await revalidateTag("tags", {})
  await revalidateTag(`tag-${id}`, {})

  // Emit socket event for real-time updates
  emitTagRemove(id, previousStatus)

  // Emit notification realtime
  await notifySuperAdminsOfTagAction(
    "hard-delete",
    ctx.actorId,
    tag
  )
}

export async function bulkHardDeleteTags(ctx: AuthContext, ids: string[]): Promise<BulkActionResult> {
  if (!canPerformAnyAction(ctx.permissions, ctx.roles, [PERMISSIONS.TAGS_MANAGE])) {
    throw new ForbiddenError()
  }

  if (!ids || ids.length === 0) {
    throw new ApplicationError("Danh sách thẻ tag trống", 400)
  }

  // Lấy thông tin tags trước khi delete để tạo notifications và socket events
  const tags = await prisma.tag.findMany({
    where: {
      id: { in: ids },
    },
    select: { id: true, name: true, slug: true, deletedAt: true },
  })

  // Nếu không tìm thấy tag nào, có thể chúng đã bị xóa rồi
  if (tags.length === 0) {
    return { 
      success: true, 
      message: `Không tìm thấy thẻ tag nào để xóa (có thể đã bị xóa trước đó)`, 
      affected: 0 
    }
  }

  // Log để debug
  logger.debug("bulkHardDeleteTags: Found tags to delete", {
    found: tags.length,
    requested: ids.length,
  })

  // Xóa tất cả tags (hard delete - xóa cả những tags đã bị soft delete)
  const result = await prisma.tag.deleteMany({
    where: {
      id: { in: tags.map((tag) => tag.id) }, // Chỉ xóa những tags thực sự tồn tại
    },
  })

  // Log để debug
  logger.debug("bulkHardDeleteTags: Deleted tags", {
    deleted: result.count,
    found: tags.length,
  })

  // Revalidate cache để cập nhật danh sách tags
  revalidatePath("/admin/tags", "page")
  revalidatePath("/admin/tags", "layout")
  // Invalidate unstable_cache với tất cả tags liên quan
  await revalidateTag("tags", {})
  await revalidateTag("tag-options", {})
  await revalidateTag("active-tags", {})

  // Emit socket events và notifications realtime cho từng tag đã được xóa
  // Emit socket events để update UI - fire and forget để tránh timeout
  // Emit song song cho tất cả tags đã bị hard delete
  if (result.count > 0) {
    // Emit events (emitTagRemove trả về void, không phải Promise)
    tags.forEach((tag) => {
      const previousStatus: "active" | "deleted" = tag.deletedAt ? "deleted" : "active"
      try {
        emitTagRemove(tag.id, previousStatus)
      } catch (error) {
        logger.error(`Failed to emit tag:remove for ${tag.id}`, error as Error)
      }
    })

    // Tạo system notifications cho từng tag
    for (const tag of tags) {
      await notifySuperAdminsOfTagAction(
        "hard-delete",
        ctx.actorId,
        { id: tag.id, name: tag.name, slug: tag.slug }
      )
    }
  }

  // Trả về số lượng tags thực sự đã được xóa
  return { 
    success: true, 
    message: `Đã xóa vĩnh viễn ${result.count} thẻ tag${result.count < tags.length ? ` (${tags.length - result.count} tag không tồn tại)` : ""}`, 
    affected: result.count 
  }
}

