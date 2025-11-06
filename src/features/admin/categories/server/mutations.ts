import type { Prisma } from "@prisma/client"
import type { Permission } from "@/lib/permissions"
import { PERMISSIONS, canPerformAction, canPerformAnyAction } from "@/lib/permissions"
import { prisma } from "@/lib/database"
import { mapCategoryRecord, type CategoryWithRelations } from "./helpers"
import type { ListedCategory } from "../types"
import { generateSlug } from "../utils"
import type { BulkActionResult } from "../types"
import {
  CreateCategorySchema,
  UpdateCategorySchema,
} from "./schemas"
import { notifySuperAdminsOfCategoryAction } from "./notifications"

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

function sanitizeCategory(category: CategoryWithRelations): ListedCategory {
  return mapCategoryRecord(category)
}

export async function createCategory(ctx: AuthContext, input: unknown): Promise<ListedCategory> {
  ensurePermission(ctx, PERMISSIONS.CATEGORIES_CREATE, PERMISSIONS.CATEGORIES_MANAGE)

  // Validate input với zod
  const validationResult = CreateCategorySchema.safeParse(input)
  if (!validationResult.success) {
    const firstError = validationResult.error.issues[0]
    throw new ApplicationError(firstError?.message || "Dữ liệu không hợp lệ", 400)
  }

  const validatedInput = validationResult.data

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

  return sanitized
}

export async function updateCategory(ctx: AuthContext, id: string, input: unknown): Promise<ListedCategory> {
  ensurePermission(ctx, PERMISSIONS.CATEGORIES_UPDATE, PERMISSIONS.CATEGORIES_MANAGE)

  if (!id || typeof id !== "string" || id.trim() === "") {
    throw new ApplicationError("ID danh mục không hợp lệ", 400)
  }

  // Validate input với zod
  const validationResult = UpdateCategorySchema.safeParse(input)
  if (!validationResult.success) {
    const firstError = validationResult.error.issues[0]
    throw new ApplicationError(firstError?.message || "Dữ liệu không hợp lệ", 400)
  }

  const validatedInput = validationResult.data

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
}

export async function bulkSoftDeleteCategories(ctx: AuthContext, ids: string[]): Promise<BulkActionResult> {
  ensurePermission(ctx, PERMISSIONS.CATEGORIES_DELETE, PERMISSIONS.CATEGORIES_MANAGE)

  if (!ids || ids.length === 0) {
    throw new ApplicationError("Danh sách danh mục trống", 400)
  }

  // Lấy thông tin categories trước khi delete để tạo notifications
  const categories = await prisma.category.findMany({
    where: {
      id: { in: ids },
      deletedAt: null,
    },
    select: { id: true, name: true, slug: true },
  })

  const result = await prisma.category.updateMany({
    where: {
      id: { in: ids },
      deletedAt: null,
    },
    data: {
      deletedAt: new Date(),
    },
  })

  // Emit notifications realtime cho từng category
  for (const category of categories) {
    await notifySuperAdminsOfCategoryAction(
      "delete",
      ctx.actorId,
      category
    )
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
}

export async function bulkRestoreCategories(ctx: AuthContext, ids: string[]): Promise<BulkActionResult> {
  ensurePermission(ctx, PERMISSIONS.CATEGORIES_UPDATE, PERMISSIONS.CATEGORIES_MANAGE)

  if (!ids || ids.length === 0) {
    throw new ApplicationError("Danh sách danh mục trống", 400)
  }

  // Lấy thông tin categories trước khi restore để tạo notifications
  const categories = await prisma.category.findMany({
    where: {
      id: { in: ids },
      deletedAt: { not: null },
    },
    select: { id: true, name: true, slug: true },
  })

  const result = await prisma.category.updateMany({
    where: {
      id: { in: ids },
      deletedAt: { not: null },
    },
    data: {
      deletedAt: null,
    },
  })

  // Emit notifications realtime cho từng category
  for (const category of categories) {
    await notifySuperAdminsOfCategoryAction(
      "restore",
      ctx.actorId,
      category
    )
  }

  return { success: true, message: `Đã khôi phục ${result.count} danh mục`, affected: result.count }
}

export async function hardDeleteCategory(ctx: AuthContext, id: string): Promise<void> {
  if (!canPerformAnyAction(ctx.permissions, ctx.roles, [PERMISSIONS.CATEGORIES_MANAGE])) {
    throw new ForbiddenError()
  }

  const category = await prisma.category.findUnique({
    where: { id },
    select: { id: true, name: true, slug: true },
  })

  if (!category) {
    throw new NotFoundError("Danh mục không tồn tại")
  }

  await prisma.category.delete({
    where: { id },
  })

  // Emit notification realtime
  await notifySuperAdminsOfCategoryAction(
    "hard-delete",
    ctx.actorId,
    category
  )
}

export async function bulkHardDeleteCategories(ctx: AuthContext, ids: string[]): Promise<BulkActionResult> {
  if (!canPerformAnyAction(ctx.permissions, ctx.roles, [PERMISSIONS.CATEGORIES_MANAGE])) {
    throw new ForbiddenError()
  }

  if (!ids || ids.length === 0) {
    throw new ApplicationError("Danh sách danh mục trống", 400)
  }

  // Lấy thông tin categories trước khi delete để tạo notifications
  const categories = await prisma.category.findMany({
    where: {
      id: { in: ids },
    },
    select: { id: true, name: true, slug: true },
  })

  const result = await prisma.category.deleteMany({
    where: {
      id: { in: ids },
    },
  })

  // Emit notifications realtime cho từng category
  for (const category of categories) {
    await notifySuperAdminsOfCategoryAction(
      "hard-delete",
      ctx.actorId,
      category
    )
  }

  return { success: true, message: `Đã xóa vĩnh viễn ${result.count} danh mục`, affected: result.count }
}

