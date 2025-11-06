import type { Prisma } from "@prisma/client"
import type { Permission } from "@/lib/permissions"
import { PERMISSIONS, canPerformAction, canPerformAnyAction } from "@/lib/permissions"
import { prisma } from "@/lib/database"
import { mapCategoryRecord, type CategoryWithRelations } from "./helpers"
import type { ListedCategory } from "../types"
import { generateSlug } from "../utils"
import type { CreateCategoryInput, UpdateCategoryInput, BulkActionResult } from "../types"

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

export async function createCategory(ctx: AuthContext, input: CreateCategoryInput): Promise<ListedCategory> {
  ensurePermission(ctx, PERMISSIONS.CATEGORIES_CREATE, PERMISSIONS.CATEGORIES_MANAGE)

  if (!input.name || typeof input.name !== "string" || input.name.trim() === "") {
    throw new ApplicationError("Tên danh mục là bắt buộc", 400)
  }

  const trimmedName = input.name.trim()
  if (trimmedName.length < 2) {
    throw new ApplicationError("Tên danh mục phải có ít nhất 2 ký tự", 400)
  }

  // Generate slug if not provided
  const slug = input.slug?.trim() || generateSlug(trimmedName)
  
  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw new ApplicationError("Slug chỉ được chứa chữ thường, số và dấu gạch ngang", 400)
  }

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
      description: input.description?.trim() || null,
    },
  })

  return sanitizeCategory(category)
}

export async function updateCategory(ctx: AuthContext, id: string, input: UpdateCategoryInput): Promise<ListedCategory> {
  ensurePermission(ctx, PERMISSIONS.CATEGORIES_UPDATE, PERMISSIONS.CATEGORIES_MANAGE)

  if (!id || typeof id !== "string" || id.trim() === "") {
    throw new ApplicationError("ID danh mục không hợp lệ", 400)
  }

  const existing = await prisma.category.findUnique({
    where: { id },
  })

  if (!existing || existing.deletedAt) {
    throw new NotFoundError("Danh mục không tồn tại")
  }

  const updateData: Prisma.CategoryUpdateInput = {}

  if (input.name !== undefined) {
    const trimmedName = input.name.trim()
    if (trimmedName.length < 2) {
      throw new ApplicationError("Tên danh mục phải có ít nhất 2 ký tự", 400)
    }

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
    }
    updateData.name = trimmedName
  }

  if (input.slug !== undefined) {
    const trimmedSlug = input.slug.trim()
    if (trimmedSlug.length < 2) {
      throw new ApplicationError("Slug phải có ít nhất 2 ký tự", 400)
    }
    if (!/^[a-z0-9-]+$/.test(trimmedSlug)) {
      throw new ApplicationError("Slug chỉ được chứa chữ thường, số và dấu gạch ngang", 400)
    }

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
    }
    updateData.slug = trimmedSlug
  }

  if (input.description !== undefined) {
    updateData.description = input.description?.trim() || null
  }

  const category = await prisma.category.update({
    where: { id },
    data: updateData,
  })

  return sanitizeCategory(category)
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
}

export async function bulkSoftDeleteCategories(ctx: AuthContext, ids: string[]): Promise<BulkActionResult> {
  ensurePermission(ctx, PERMISSIONS.CATEGORIES_DELETE, PERMISSIONS.CATEGORIES_MANAGE)

  if (!ids || ids.length === 0) {
    throw new ApplicationError("Danh sách danh mục trống", 400)
  }

  const result = await prisma.category.updateMany({
    where: {
      id: { in: ids },
      deletedAt: null,
    },
    data: {
      deletedAt: new Date(),
    },
  })

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
}

export async function bulkRestoreCategories(ctx: AuthContext, ids: string[]): Promise<BulkActionResult> {
  ensurePermission(ctx, PERMISSIONS.CATEGORIES_UPDATE, PERMISSIONS.CATEGORIES_MANAGE)

  if (!ids || ids.length === 0) {
    throw new ApplicationError("Danh sách danh mục trống", 400)
  }

  const result = await prisma.category.updateMany({
    where: {
      id: { in: ids },
      deletedAt: { not: null },
    },
    data: {
      deletedAt: null,
    },
  })

  return { success: true, message: `Đã khôi phục ${result.count} danh mục`, affected: result.count }
}

export async function hardDeleteCategory(ctx: AuthContext, id: string): Promise<void> {
  if (!canPerformAnyAction(ctx.permissions, ctx.roles, [PERMISSIONS.CATEGORIES_MANAGE])) {
    throw new ForbiddenError()
  }

  const category = await prisma.category.findUnique({
    where: { id },
    select: { id: true },
  })

  if (!category) {
    throw new NotFoundError("Danh mục không tồn tại")
  }

  await prisma.category.delete({
    where: { id },
  })
}

export async function bulkHardDeleteCategories(ctx: AuthContext, ids: string[]): Promise<BulkActionResult> {
  if (!canPerformAnyAction(ctx.permissions, ctx.roles, [PERMISSIONS.CATEGORIES_MANAGE])) {
    throw new ForbiddenError()
  }

  if (!ids || ids.length === 0) {
    throw new ApplicationError("Danh sách danh mục trống", 400)
  }

  const result = await prisma.category.deleteMany({
    where: {
      id: { in: ids },
    },
  })

  return { success: true, message: `Đã xóa vĩnh viễn ${result.count} danh mục`, affected: result.count }
}

