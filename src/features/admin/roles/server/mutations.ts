"use server"

import type { Prisma } from "@prisma/client"
import { PERMISSIONS, canPerformAnyAction } from "@/lib/permissions"
import { prisma } from "@/lib/database"
import { logger } from "@/lib/config"
import { mapRoleRecord, type ListedRole, type RoleWithRelations } from "./queries"
import {
  CreateRoleSchema,
  UpdateRoleSchema,
  type CreateRoleInput,
  type UpdateRoleInput,
} from "./schemas"
import { notifySuperAdminsOfRoleAction } from "./notifications"
import {
  ApplicationError,
  ForbiddenError,
  NotFoundError,
  ensurePermission,
  invalidateResourceCache,
  invalidateResourceCacheBulk,
  type AuthContext,
} from "@/features/admin/resources/server"
import { emitRoleUpsert, emitRoleRemove } from "./events"

// Re-export for backward compatibility with API routes
export { ApplicationError, ForbiddenError, NotFoundError, type AuthContext }

export interface BulkActionResult {
  success: boolean
  message: string
  affected: number
}

function sanitizeRole(role: RoleWithRelations): ListedRole {
  return mapRoleRecord(role)
}

export async function createRole(ctx: AuthContext, input: CreateRoleInput): Promise<ListedRole> {
  ensurePermission(ctx, PERMISSIONS.ROLES_CREATE, PERMISSIONS.ROLES_MANAGE)

  // Validate input với zod
  const validatedInput = CreateRoleSchema.parse(input)

  const existing = await prisma.role.findUnique({ where: { name: validatedInput.name.trim() } })
  if (existing) {
    throw new ApplicationError("Tên vai trò đã tồn tại", 400)
  }

  const role = await prisma.role.create({
    data: {
      name: validatedInput.name.trim(),
      displayName: validatedInput.displayName.trim(),
      description: validatedInput.description?.trim() || null,
      permissions: validatedInput.permissions || [],
      isActive: validatedInput.isActive ?? true,
    },
  })

  const sanitized = sanitizeRole(role)

  // Invalidate cache
  await invalidateResourceCache({
    resource: "roles",
    id: sanitized.id,
    additionalTags: ["active-roles"],
  })

  // Emit socket event for real-time updates
  await emitRoleUpsert(sanitized.id, null)

  // Emit notification realtime
  await notifySuperAdminsOfRoleAction(
    "create",
    ctx.actorId,
    {
      id: sanitized.id,
      name: sanitized.name,
      displayName: sanitized.displayName,
    }
  )

  return sanitized
}

export async function updateRole(ctx: AuthContext, id: string, input: UpdateRoleInput): Promise<ListedRole> {
  ensurePermission(ctx, PERMISSIONS.ROLES_UPDATE, PERMISSIONS.ROLES_MANAGE)

  // Validate ID
  if (!id || typeof id !== "string" || id.trim() === "") {
    throw new ApplicationError("ID vai trò không hợp lệ", 400)
  }

  // Validate input với zod
  const validatedInput = UpdateRoleSchema.parse(input)

  const existing = await prisma.role.findUnique({
    where: { id },
  })

  if (!existing || existing.deletedAt) {
    throw new NotFoundError("Vai trò không tồn tại")
  }

  // Check if name is already used by another role
  if (validatedInput.name !== undefined && validatedInput.name.trim() !== existing.name) {
    const nameExists = await prisma.role.findUnique({ where: { name: validatedInput.name.trim() } })
    if (nameExists) {
      throw new ApplicationError("Tên vai trò đã được sử dụng", 400)
    }
  }

  // Track changes for notifications
  const changes: {
    name?: { old: string; new: string }
    displayName?: { old: string; new: string }
    description?: { old: string | null; new: string | null }
    permissions?: { old: string[]; new: string[] }
    isActive?: { old: boolean; new: boolean }
  } = {}

  if (validatedInput.name !== undefined && validatedInput.name.trim() !== existing.name) {
    changes.name = { old: existing.name, new: validatedInput.name.trim() }
  }
  if (validatedInput.displayName !== undefined && validatedInput.displayName.trim() !== existing.displayName) {
    changes.displayName = { old: existing.displayName, new: validatedInput.displayName.trim() }
  }
  if (validatedInput.description !== undefined && validatedInput.description?.trim() !== existing.description) {
    changes.description = { old: existing.description, new: validatedInput.description?.trim() || null }
  }
  if (validatedInput.permissions !== undefined) {
    const oldPerms = existing.permissions.sort()
    const newPerms = validatedInput.permissions.sort()
    if (JSON.stringify(oldPerms) !== JSON.stringify(newPerms)) {
      changes.permissions = { old: existing.permissions, new: validatedInput.permissions }
    }
  }
  if (validatedInput.isActive !== undefined && validatedInput.isActive !== existing.isActive) {
    changes.isActive = { old: existing.isActive, new: validatedInput.isActive }
  }

  const updateData: Prisma.RoleUpdateInput = {}

  if (validatedInput.name !== undefined) updateData.name = validatedInput.name.trim()
  if (validatedInput.displayName !== undefined) updateData.displayName = validatedInput.displayName.trim()
  if (validatedInput.description !== undefined) updateData.description = validatedInput.description?.trim() || null
  if (validatedInput.permissions !== undefined) updateData.permissions = validatedInput.permissions
  if (validatedInput.isActive !== undefined) updateData.isActive = validatedInput.isActive

  const role = await prisma.role.update({
    where: { id },
    data: updateData,
  })

  const sanitized = sanitizeRole(role)

  // Invalidate cache - QUAN TRỌNG: phải invalidate detail page để cập nhật ngay
  await invalidateResourceCache({
    resource: "roles",
    id,
    additionalTags: ["active-roles"],
  })

  // Determine previous status for socket event
  const previousStatus: "active" | "deleted" | null = existing.deletedAt ? "deleted" : "active"

  // Emit socket event for real-time updates
  await emitRoleUpsert(sanitized.id, previousStatus)

  // Emit notification realtime
  await notifySuperAdminsOfRoleAction(
    "update",
    ctx.actorId,
    {
      id: sanitized.id,
      name: sanitized.name,
      displayName: sanitized.displayName,
    },
    Object.keys(changes).length > 0 ? changes : undefined
  )

  return sanitized
}

export async function softDeleteRole(ctx: AuthContext, id: string): Promise<void> {
  ensurePermission(ctx, PERMISSIONS.ROLES_DELETE, PERMISSIONS.ROLES_MANAGE)

  const role = await prisma.role.findUnique({ where: { id } })
  if (!role || role.deletedAt) {
    throw new NotFoundError("Vai trò không tồn tại")
  }

  // Prevent deleting super_admin role
  if (role.name === "super_admin") {
    throw new ApplicationError("Không thể xóa vai trò super_admin", 400)
  }

  const previousStatus: "active" | "deleted" = role.deletedAt ? "deleted" : "active"

  await prisma.role.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      isActive: false,
    },
  })

  // Invalidate cache
  await invalidateResourceCache({
    resource: "roles",
    id,
    additionalTags: ["active-roles"],
  })

  // Emit socket event for real-time updates
  await emitRoleUpsert(id, previousStatus)

  // Emit notification realtime
  await notifySuperAdminsOfRoleAction(
    "delete",
    ctx.actorId,
    {
      id: role.id,
      name: role.name,
      displayName: role.displayName,
    }
  )
}

export async function bulkSoftDeleteRoles(ctx: AuthContext, ids: string[]): Promise<BulkActionResult> {
  ensurePermission(ctx, PERMISSIONS.ROLES_DELETE, PERMISSIONS.ROLES_MANAGE)

  if (!ids || ids.length === 0) {
    throw new ApplicationError("Danh sách vai trò trống", 400)
  }

  // Check if any role is super_admin
  const roles = await prisma.role.findMany({
    where: {
      id: { in: ids },
      deletedAt: null,
    },
    select: { id: true, name: true, displayName: true },
  })

  const superAdminRole = roles.find((r) => r.name === "super_admin")
  if (superAdminRole) {
    throw new ApplicationError("Không thể xóa vai trò super_admin", 400)
  }

  const result = await prisma.role.updateMany({
    where: {
      id: { in: ids },
      deletedAt: null,
    },
    data: {
      deletedAt: new Date(),
      isActive: false,
    },
  })

  // Invalidate cache cho bulk operation
  await invalidateResourceCacheBulk({
    resource: "roles",
    additionalTags: ["active-roles"],
  })

  // Emit socket events để update UI - await song song để đảm bảo tất cả events được emit
  // Sử dụng Promise.allSettled để không bị fail nếu một event lỗi
  if (result.count > 0) {
    // Emit events song song và await tất cả để đảm bảo hoàn thành
    const emitPromises = roles.map((role) => 
      emitRoleUpsert(role.id, "active").catch((error) => {
        logger.error(`Failed to emit role:upsert for ${role.id}`, error as Error)
        return null // Return null để Promise.allSettled không throw
      })
    )
    // Await tất cả events nhưng không fail nếu một số lỗi
    await Promise.allSettled(emitPromises)

    // Emit notifications realtime cho từng role
    for (const role of roles) {
      await notifySuperAdminsOfRoleAction(
        "delete",
        ctx.actorId,
        role
      )
    }
  }

  return { success: true, message: `Đã xóa ${result.count} vai trò`, affected: result.count }
}

export async function restoreRole(ctx: AuthContext, id: string): Promise<void> {
  ensurePermission(ctx, PERMISSIONS.ROLES_UPDATE, PERMISSIONS.ROLES_MANAGE)

  const role = await prisma.role.findUnique({ where: { id } })
  if (!role || !role.deletedAt) {
    throw new NotFoundError("Vai trò không tồn tại hoặc chưa bị xóa")
  }

  const previousStatus: "active" | "deleted" = role.deletedAt ? "deleted" : "active"

  await prisma.role.update({
    where: { id },
    data: {
      deletedAt: null,
      isActive: true,
    },
  })

  // Invalidate cache
  await invalidateResourceCache({
    resource: "roles",
    id,
    additionalTags: ["active-roles"],
  })

  // Emit socket event for real-time updates
  await emitRoleUpsert(id, previousStatus)

  // Emit notification realtime
  await notifySuperAdminsOfRoleAction(
    "restore",
    ctx.actorId,
    {
      id: role.id,
      name: role.name,
      displayName: role.displayName,
    }
  )
}

export async function bulkRestoreRoles(ctx: AuthContext, ids: string[]): Promise<BulkActionResult> {
  ensurePermission(ctx, PERMISSIONS.ROLES_UPDATE, PERMISSIONS.ROLES_MANAGE)

  if (!ids || ids.length === 0) {
    throw new ApplicationError("Danh sách vai trò trống", 400)
  }

  // Tìm tất cả roles được request để phân loại trạng thái
  // Prisma findMany mặc định KHÔNG filter theo deletedAt, nên sẽ tìm thấy cả soft-deleted và active roles
  // Nhưng KHÔNG tìm thấy hard-deleted roles (đã bị xóa vĩnh viễn khỏi database)
  // Sử dụng findMany mà KHÔNG filter theo deletedAt để tìm được tất cả roles (kể cả đã bị soft delete)
  const allRequestedRoles = await prisma.role.findMany({
    where: {
      id: { in: ids },
      // KHÔNG filter theo deletedAt ở đây để tìm được cả soft-deleted và active roles
    },
    select: { id: true, deletedAt: true, name: true, displayName: true, createdAt: true },
  })

  // Phân loại roles
  const softDeletedRoles = allRequestedRoles.filter((role) => role.deletedAt !== null)
  const activeRoles = allRequestedRoles.filter((role) => role.deletedAt === null)
  const notFoundCount = ids.length - allRequestedRoles.length

  // Log chi tiết để debug
  logger.debug("bulkRestoreRoles: Role status analysis", {
    requested: ids.length,
    found: allRequestedRoles.length,
    softDeleted: softDeletedRoles.length,
    active: activeRoles.length,
    notFound: notFoundCount,
    requestedIds: ids,
    foundIds: allRequestedRoles.map((r) => r.id),
    softDeletedIds: softDeletedRoles.map((r) => r.id),
    activeIds: activeRoles.map((r) => r.id),
    softDeletedDetails: softDeletedRoles.map((r) => ({
      id: r.id,
      name: r.name,
      deletedAt: r.deletedAt,
      createdAt: r.createdAt,
    })),
  })

  // Nếu không có role nào đã bị soft delete, trả về message chi tiết
  if (softDeletedRoles.length === 0) {
    const parts: string[] = []
    if (activeRoles.length > 0) {
      parts.push(`${activeRoles.length} vai trò đang hoạt động`)
    }
    if (notFoundCount > 0) {
      parts.push(`${notFoundCount} vai trò không tồn tại (đã bị xóa vĩnh viễn)`)
    }

    const message = parts.length > 0
      ? `Không có vai trò nào để khôi phục (${parts.join(", ")})`
      : `Không tìm thấy vai trò nào để khôi phục`

    return { 
      success: true, 
      message, 
      affected: 0,
    }
  }

  // Chỉ restore các roles đã bị soft delete
  const roles = softDeletedRoles
  const result = await prisma.role.updateMany({
    where: { 
      id: { in: softDeletedRoles.map((r) => r.id) },
      deletedAt: { not: null },
    },
    data: {
      deletedAt: null,
      isActive: true,
    },
  })

  logger.debug("bulkRestoreRoles: Restored roles", {
    restoredCount: result.count,
    totalSoftDeletedFound: softDeletedRoles.length,
  })

  // Invalidate cache cho bulk operation
  await invalidateResourceCacheBulk({
    resource: "roles",
    additionalTags: ["active-roles"],
  })

  // Emit socket events để update UI - await song song để đảm bảo tất cả events được emit
  // Sử dụng Promise.allSettled để không bị fail nếu một event lỗi
  if (result.count > 0) {
    // Emit events song song và await tất cả để đảm bảo hoàn thành
    const emitPromises = roles.map((role) => 
      emitRoleUpsert(role.id, "deleted").catch((error) => {
        logger.error(`Failed to emit role:upsert for ${role.id}`, error as Error)
        return null // Return null để Promise.allSettled không throw
      })
    )
    // Await tất cả events nhưng không fail nếu một số lỗi
    await Promise.allSettled(emitPromises)

    // Emit notifications realtime cho từng role
    for (const role of roles) {
      await notifySuperAdminsOfRoleAction(
        "restore",
        ctx.actorId,
        role
      )
    }
  }

  // Tạo message chi tiết nếu có roles không thể restore
  let message = `Đã khôi phục ${result.count} vai trò`
  if (result.count < ids.length) {
    const skippedCount = ids.length - result.count
    const skippedParts: string[] = []
    if (activeRoles.length > 0) {
      skippedParts.push(`${activeRoles.length} vai trò đang hoạt động`)
    }
    if (notFoundCount > 0) {
      skippedParts.push(`${notFoundCount} vai trò đã bị xóa vĩnh viễn`)
    }
    if (skippedParts.length > 0) {
      message += ` (${skippedCount} vai trò không thể khôi phục: ${skippedParts.join(", ")})`
    }
  }

  return { success: true, message, affected: result.count }
}

export async function hardDeleteRole(ctx: AuthContext, id: string): Promise<void> {
  if (!canPerformAnyAction(ctx.permissions, ctx.roles, [PERMISSIONS.ROLES_MANAGE])) {
    throw new ForbiddenError()
  }

  const role = await prisma.role.findUnique({
    where: { id },
    select: { id: true, name: true, displayName: true, deletedAt: true },
  })

  if (!role) {
    throw new NotFoundError("Vai trò không tồn tại")
  }

  // Prevent deleting super_admin role
  if (role.name === "super_admin") {
    throw new ApplicationError("Không thể xóa vĩnh viễn vai trò super_admin", 400)
  }

  const previousStatus: "active" | "deleted" = role.deletedAt ? "deleted" : "active"

  await prisma.role.delete({
    where: { id },
  })

  // Invalidate cache
  await invalidateResourceCache({
    resource: "roles",
    id,
    additionalTags: ["active-roles"],
  })

  // Emit socket event for real-time updates
  emitRoleRemove(id, previousStatus)

  // Emit notification realtime
  await notifySuperAdminsOfRoleAction(
    "hard-delete",
    ctx.actorId,
    role
  )
}

export async function bulkHardDeleteRoles(ctx: AuthContext, ids: string[]): Promise<BulkActionResult> {
  if (!canPerformAnyAction(ctx.permissions, ctx.roles, [PERMISSIONS.ROLES_MANAGE])) {
    throw new ForbiddenError()
  }

  if (!ids || ids.length === 0) {
    throw new ApplicationError("Danh sách vai trò trống", 400)
  }

  // Check if any role is super_admin
  const roles = await prisma.role.findMany({
    where: {
      id: { in: ids },
    },
    select: { id: true, name: true, displayName: true, deletedAt: true },
  })

  const superAdminRole = roles.find((r) => r.name === "super_admin")
  if (superAdminRole) {
    throw new ApplicationError("Không thể xóa vĩnh viễn vai trò super_admin", 400)
  }

  const result = await prisma.role.deleteMany({
    where: {
      id: { in: ids },
    },
  })

  // Invalidate cache cho bulk operation
  await invalidateResourceCacheBulk({
    resource: "roles",
    additionalTags: ["active-roles"],
  })

  // Emit socket events để update UI - fire and forget để tránh timeout
  // Emit song song cho tất cả roles đã bị hard delete
  if (result.count > 0) {
    // Emit events (emitRoleRemove trả về void, không phải Promise)
    roles.forEach((role) => {
      const previousStatus: "active" | "deleted" = role.deletedAt ? "deleted" : "active"
      try {
        emitRoleRemove(role.id, previousStatus)
      } catch (error) {
        logger.error(`Failed to emit role:remove for ${role.id}`, error as Error)
      }
    })

    // Emit notifications realtime cho từng role
    for (const role of roles) {
      await notifySuperAdminsOfRoleAction(
        "hard-delete",
        ctx.actorId,
        role
      )
    }
  }

  return { success: true, message: `Đã xóa vĩnh viễn ${result.count} vai trò`, affected: result.count }
}

