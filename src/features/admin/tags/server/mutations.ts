import type { Prisma } from "@prisma/client"
import { PERMISSIONS, canPerformAnyAction } from "@/lib/permissions"
import { prisma } from "@/lib/database"
import { mapTagRecord, type TagWithRelations } from "./helpers"
import type { ListedTag } from "../types"
import { generateSlug } from "../utils"
import type { BulkActionResult } from "../types"
import {
  CreateTagSchema,
  UpdateTagSchema,
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

export async function createTag(ctx: AuthContext, input: unknown): Promise<ListedTag> {
  ensurePermission(ctx, PERMISSIONS.TAGS_CREATE, PERMISSIONS.TAGS_MANAGE)

  // Validate input với zod
  const validationResult = CreateTagSchema.safeParse(input)
  if (!validationResult.success) {
    const firstError = validationResult.error.issues[0]
    throw new ApplicationError(firstError?.message || "Dữ liệu không hợp lệ", 400)
  }

  const validatedInput = validationResult.data

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

export async function updateTag(ctx: AuthContext, id: string, input: unknown): Promise<ListedTag> {
  ensurePermission(ctx, PERMISSIONS.TAGS_UPDATE, PERMISSIONS.TAGS_MANAGE)

  if (!id || typeof id !== "string" || id.trim() === "") {
    throw new ApplicationError("ID thẻ tag không hợp lệ", 400)
  }

  // Validate input với zod
  const validationResult = UpdateTagSchema.safeParse(input)
  if (!validationResult.success) {
    const firstError = validationResult.error.issues[0]
    throw new ApplicationError(firstError?.message || "Dữ liệu không hợp lệ", 400)
  }

  const validatedInput = validationResult.data

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
  const tags = await prisma.tag.findMany({
    where: {
      id: { in: ids },
      deletedAt: null,
    },
    select: { id: true, name: true, slug: true },
  })

  const result = await prisma.tag.updateMany({
    where: {
      id: { in: ids },
      deletedAt: null,
    },
    data: {
      deletedAt: new Date(),
    },
  })

  // Emit socket events để update UI - await song song để đảm bảo tất cả events được emit
  // Sử dụng Promise.allSettled để không bị fail nếu một event lỗi
  if (result.count > 0) {
    // Emit events song song và await tất cả để đảm bảo hoàn thành
    const emitPromises = tags.map((tag) => 
      emitTagUpsert(tag.id, "active").catch((error) => {
        console.error(`Failed to emit tag:upsert for ${tag.id}:`, error)
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

  // Lấy thông tin tags trước khi restore để tạo notifications
  const tags = await prisma.tag.findMany({
    where: {
      id: { in: ids },
      deletedAt: { not: null },
    },
    select: { id: true, name: true, slug: true },
  })

  const result = await prisma.tag.updateMany({
    where: {
      id: { in: ids },
      deletedAt: { not: null },
    },
    data: {
      deletedAt: null,
    },
  })

  // Emit socket events để update UI - await song song để đảm bảo tất cả events được emit
  // Sử dụng Promise.allSettled để không bị fail nếu một event lỗi
  if (result.count > 0) {
    // Emit events song song và await tất cả để đảm bảo hoàn thành
    const emitPromises = tags.map((tag) => 
      emitTagUpsert(tag.id, "deleted").catch((error) => {
        console.error(`Failed to emit tag:upsert for ${tag.id}:`, error)
        return null // Return null để Promise.allSettled không throw
      })
    )
    // Await tất cả events nhưng không fail nếu một số lỗi
    await Promise.allSettled(emitPromises)

    // Tạo system notifications cho từng tag
    for (const tag of tags) {
      await notifySuperAdminsOfTagAction(
        "restore",
        ctx.actorId,
        tag
      )
    }
  }

  return { success: true, message: `Đã khôi phục ${result.count} thẻ tag`, affected: result.count }
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

  const result = await prisma.tag.deleteMany({
    where: {
      id: { in: ids },
    },
  })

  // Emit socket events và notifications realtime cho từng tag
  // Emit socket events để update UI - fire and forget để tránh timeout
  // Emit song song cho tất cả tags đã bị hard delete
  if (result.count > 0) {
    // Emit events (emitTagRemove trả về void, không phải Promise)
    tags.forEach((tag) => {
      const previousStatus: "active" | "deleted" = tag.deletedAt ? "deleted" : "active"
      try {
        emitTagRemove(tag.id, previousStatus)
      } catch (error) {
        console.error(`Failed to emit tag:remove for ${tag.id}:`, error)
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

  return { success: true, message: `Đã xóa vĩnh viễn ${result.count} thẻ tag`, affected: result.count }
}

