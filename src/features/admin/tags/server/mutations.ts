import type { Prisma } from "@prisma/client"
import type { Permission } from "@/lib/permissions"
import { PERMISSIONS, canPerformAction, canPerformAnyAction } from "@/lib/permissions"
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

export interface AuthContext {
  actorId: string
  permissions: Permission[]
  roles: Array<{ name: string }>
}

export class ApplicationError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

export class ForbiddenError extends ApplicationError {
  constructor(message = "Forbidden") {
    super(message, 403)
  }
}

export class NotFoundError extends ApplicationError {
  constructor(message = "Not found") {
    super(message, 404)
  }
}

function ensurePermission(ctx: AuthContext, ...required: Permission[]) {
  const allowed = required.some((perm) => canPerformAction(ctx.permissions, ctx.roles, perm))
  if (!allowed) {
    throw new ForbiddenError()
  }
}

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

  // Emit notifications realtime cho từng tag
  for (const tag of tags) {
    await notifySuperAdminsOfTagAction(
      "delete",
      ctx.actorId,
      tag
    )
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

  // Emit notifications realtime cho từng tag
  for (const tag of tags) {
    await notifySuperAdminsOfTagAction(
      "restore",
      ctx.actorId,
      tag
    )
  }

  return { success: true, message: `Đã khôi phục ${result.count} thẻ tag`, affected: result.count }
}

export async function hardDeleteTag(ctx: AuthContext, id: string): Promise<void> {
  if (!canPerformAnyAction(ctx.permissions, ctx.roles, [PERMISSIONS.TAGS_MANAGE])) {
    throw new ForbiddenError()
  }

  const tag = await prisma.tag.findUnique({
    where: { id },
    select: { id: true, name: true, slug: true },
  })

  if (!tag) {
    throw new NotFoundError("Thẻ tag không tồn tại")
  }

  await prisma.tag.delete({
    where: { id },
  })

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

  // Lấy thông tin tags trước khi delete để tạo notifications
  const tags = await prisma.tag.findMany({
    where: {
      id: { in: ids },
    },
    select: { id: true, name: true, slug: true },
  })

  const result = await prisma.tag.deleteMany({
    where: {
      id: { in: ids },
    },
  })

  // Emit notifications realtime cho từng tag
  for (const tag of tags) {
    await notifySuperAdminsOfTagAction(
      "hard-delete",
      ctx.actorId,
      tag
    )
  }

  return { success: true, message: `Đã xóa vĩnh viễn ${result.count} thẻ tag`, affected: result.count }
}

