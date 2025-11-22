"use server"

import type { Prisma } from "@prisma/client"
import { PERMISSIONS, canPerformAnyAction } from "@/lib/permissions"
import { prisma } from "@/lib/database"
import { resourceLogger } from "@/lib/config"
import { mapRoleRecord, type ListedRole } from "./queries"
import {
  CreateRoleSchema,
  UpdateRoleSchema,
  type CreateRoleInput,
  type UpdateRoleInput,
} from "./schemas"
import { notifySuperAdminsOfRoleAction, notifySuperAdminsOfBulkRoleAction } from "./notifications"
import {
  ApplicationError,
  ForbiddenError,
  NotFoundError,
  ensurePermission,
  invalidateResourceCache,
  invalidateResourceCacheBulk,
  type AuthContext,
} from "@/features/admin/resources/server"
import type { BulkActionResult } from "@/features/admin/resources/types"
import { emitRoleUpsert, emitRoleRemove } from "./events"

// Re-export for backward compatibility with API routes
export { ApplicationError, ForbiddenError, NotFoundError, type AuthContext }
export type { BulkActionResult }

export async function createRole(ctx: AuthContext, input: CreateRoleInput): Promise<ListedRole> {
  const startTime = Date.now()
  
  resourceLogger.actionFlow({
    resource: "roles",
    action: "create",
    step: "start",
    metadata: { actorId: ctx.actorId, input: { name: input.name, displayName: input.displayName } },
  })

  ensurePermission(ctx, PERMISSIONS.ROLES_CREATE, PERMISSIONS.ROLES_MANAGE)

  // Validate input với zod
  const validatedInput = CreateRoleSchema.parse(input)

  const existing = await prisma.role.findUnique({ where: { name: validatedInput.name.trim() } })
  if (existing) {
    resourceLogger.actionFlow({
      resource: "roles",
      action: "create",
      step: "error",
      metadata: { error: "Tên vai trò đã tồn tại", name: validatedInput.name.trim() },
    })
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

  const sanitized = mapRoleRecord(role)

  // Invalidate cache - cần invalidate cả active và deleted views
  resourceLogger.cache({
    resource: "roles",
    action: "cache-invalidate",
    operation: "invalidate",
    resourceId: sanitized.id,
    tags: ["roles", `role-${sanitized.id}`, "active-roles", "deleted-roles"],
  })
  await invalidateResourceCache({
    resource: "roles",
    id: sanitized.id,
    additionalTags: ["active-roles", "deleted-roles"],
  })

  // Emit socket event for real-time updates
  resourceLogger.socket({
    resource: "roles",
    action: "create",
    event: "role:upsert",
    resourceId: sanitized.id,
    payload: { roleId: sanitized.id, status: "active" },
  })
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

  resourceLogger.actionFlow({
    resource: "roles",
    action: "create",
    step: "success",
    duration: Date.now() - startTime,
    metadata: { roleId: sanitized.id, roleName: sanitized.name, roleDisplayName: sanitized.displayName },
  })

  resourceLogger.detailAction({
    resource: "roles",
    action: "create",
    resourceId: sanitized.id,
    roleName: sanitized.name,
    roleDisplayName: sanitized.displayName,
  })

  return sanitized
}

export async function updateRole(ctx: AuthContext, id: string, input: UpdateRoleInput): Promise<ListedRole> {
  const startTime = Date.now()
  
  resourceLogger.actionFlow({
    resource: "roles",
    action: "update",
    step: "start",
    metadata: { roleId: id, actorId: ctx.actorId, input },
  })

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

  // Track changes và build update data
  const changes: {
    name?: { old: string; new: string }
    displayName?: { old: string; new: string }
    description?: { old: string | null; new: string | null }
    permissions?: { old: string[]; new: string[] }
    isActive?: { old: boolean; new: boolean }
  } = {}
  const updateData: Prisma.RoleUpdateInput = {}

  // Check và update name
  if (validatedInput.name !== undefined) {
    const trimmedName = validatedInput.name.trim()
    if (trimmedName !== existing.name) {
      if (existing.name === "super_admin") {
        resourceLogger.actionFlow({
          resource: "roles",
          action: "update",
          step: "error",
          metadata: { roleId: id, error: "Không thể đổi tên vai trò super_admin" },
        })
        throw new ApplicationError("Không thể đổi tên vai trò super_admin", 400)
      }
      const nameExists = await prisma.role.findFirst({ where: { name: trimmedName, id: { not: id } } })
      if (nameExists) {
        resourceLogger.actionFlow({
          resource: "roles",
          action: "update",
          step: "error",
          metadata: { roleId: id, error: "Tên vai trò đã tồn tại", newName: trimmedName },
        })
        throw new ApplicationError("Tên vai trò đã tồn tại", 400)
      }
      updateData.name = trimmedName
      changes.name = { old: existing.name, new: trimmedName }
    }
  }
  // Update displayName
  if (validatedInput.displayName !== undefined) {
    const trimmedDisplayName = validatedInput.displayName.trim()
    if (trimmedDisplayName !== existing.displayName) {
      updateData.displayName = trimmedDisplayName
      changes.displayName = { old: existing.displayName, new: trimmedDisplayName }
    }
  }

  // Update description
  if (validatedInput.description !== undefined) {
    const trimmedDescription = validatedInput.description?.trim() || null
    if (trimmedDescription !== existing.description) {
      updateData.description = trimmedDescription
      changes.description = { old: existing.description, new: trimmedDescription }
    }
  }

  // Update permissions
  if (validatedInput.permissions !== undefined) {
    const oldPerms = existing.permissions.sort()
    const newPerms = validatedInput.permissions.sort()
    if (JSON.stringify(oldPerms) !== JSON.stringify(newPerms)) {
      updateData.permissions = validatedInput.permissions
      changes.permissions = { old: existing.permissions, new: validatedInput.permissions }
    }
  }

  // Update isActive
  if (validatedInput.isActive !== undefined && validatedInput.isActive !== existing.isActive) {
    updateData.isActive = validatedInput.isActive
    changes.isActive = { old: existing.isActive, new: validatedInput.isActive }
  }

  // Chỉ update nếu có thay đổi
  if (Object.keys(updateData).length === 0) {
    const sanitized = mapRoleRecord(existing)
    resourceLogger.actionFlow({
      resource: "roles",
      action: "update",
      step: "success",
      duration: Date.now() - startTime,
      metadata: { roleId: sanitized.id, roleName: sanitized.name, changes: {}, noChanges: true },
    })
    return sanitized
  }

  const updated = await prisma.role.update({
    where: { id },
    data: { ...updateData, updatedAt: new Date() },
  })

  const sanitized = mapRoleRecord(updated)

  // Invalidate cache - cần invalidate cả active và deleted views
  resourceLogger.cache({
    resource: "roles",
    action: "cache-invalidate",
    operation: "invalidate",
    resourceId: sanitized.id,
    tags: ["roles", `role-${sanitized.id}`, "active-roles", "deleted-roles"],
  })
  await invalidateResourceCache({
    resource: "roles",
    id: sanitized.id,
    additionalTags: ["active-roles", "deleted-roles"],
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

  resourceLogger.actionFlow({
    resource: "roles",
    action: "update",
    step: "success",
    duration: Date.now() - startTime,
    metadata: { roleId: sanitized.id, roleName: sanitized.name, changes },
  })

  resourceLogger.detailAction({
    resource: "roles",
    action: "update",
    resourceId: sanitized.id,
    roleName: sanitized.name,
    roleDisplayName: sanitized.displayName,
    changes,
  })

  return sanitized
}

export async function softDeleteRole(ctx: AuthContext, id: string): Promise<void> {
  const startTime = Date.now()
  
  resourceLogger.actionFlow({
    resource: "roles",
    action: "delete",
    step: "start",
    metadata: { roleId: id, actorId: ctx.actorId },
  })

  ensurePermission(ctx, PERMISSIONS.ROLES_DELETE, PERMISSIONS.ROLES_MANAGE)

  const role = await prisma.role.findUnique({ where: { id } })
  if (!role || role.deletedAt) {
    resourceLogger.actionFlow({
      resource: "roles",
      action: "delete",
      step: "error",
      metadata: { roleId: id, error: "Vai trò không tồn tại" },
    })
    throw new NotFoundError("Vai trò không tồn tại")
  }

  // Prevent deleting super_admin role
  if (role.name === "super_admin") {
    resourceLogger.actionFlow({
      resource: "roles",
      action: "delete",
      step: "error",
      metadata: { roleId: id, roleName: role.name, error: "Không thể xóa vai trò super_admin" },
    })
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

  // Invalidate cache - cần invalidate cả active và deleted views
  resourceLogger.cache({
    resource: "roles",
    action: "cache-invalidate",
    operation: "invalidate",
    resourceId: id,
    tags: ["roles", `role-${id}`, "active-roles", "deleted-roles"],
  })
  await invalidateResourceCache({
    resource: "roles",
    id,
    additionalTags: ["active-roles", "deleted-roles"],
  })

  // Emit socket event for real-time updates
  resourceLogger.socket({
    resource: "roles",
    action: "delete",
    event: "role:upsert",
    resourceId: id,
    payload: { roleId: id, previousStatus, newStatus: "deleted" },
  })
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

  resourceLogger.actionFlow({
    resource: "roles",
    action: "delete",
    step: "success",
    duration: Date.now() - startTime,
    metadata: { roleId: id, roleName: role.name, roleDisplayName: role.displayName },
  })
}

export async function bulkSoftDeleteRoles(ctx: AuthContext, ids: string[]): Promise<BulkActionResult> {
  const startTime = Date.now()
  
  resourceLogger.actionFlow({
    resource: "roles",
    action: "bulk-delete",
    step: "start",
    metadata: { count: ids.length, roleIds: ids, actorId: ctx.actorId },
  })

  ensurePermission(ctx, PERMISSIONS.ROLES_DELETE, PERMISSIONS.ROLES_MANAGE)

  if (!ids || ids.length === 0) {
    throw new ApplicationError("Danh sách vai trò trống", 400)
  }

  // Lấy thông tin roles trước khi delete để tạo notifications
  // Chỉ tìm các roles đang hoạt động (chưa bị xóa)
  const roles = await prisma.role.findMany({
    where: {
      id: { in: ids },
      deletedAt: null,
    },
    select: { id: true, name: true, displayName: true },
  })

  const foundIds = roles.map(r => r.id)
  const notFoundIds = ids.filter(id => !foundIds.includes(id))

  // Check if any role is super_admin
  const superAdminRole = roles.find((r) => r.name === "super_admin")
  if (superAdminRole) {
    const errorMessage = "Không thể xóa vai trò super_admin"
    resourceLogger.actionFlow({
      resource: "roles",
      action: "bulk-delete",
      step: "error",
      metadata: {
        requestedCount: ids.length,
        foundCount: roles.length,
        error: errorMessage,
        superAdminRoleId: superAdminRole.id,
      },
    })
    throw new ApplicationError(errorMessage, 400)
  }

  // Nếu không tìm thấy role nào, kiểm tra lý do và trả về error message chi tiết
  if (roles.length === 0) {
    const allRoles = await prisma.role.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, displayName: true, deletedAt: true },
    })
    const alreadyDeletedRoles = allRoles.filter(r => r.deletedAt !== null && r.deletedAt !== undefined)
    const alreadyDeletedCount = alreadyDeletedRoles.length
    const notFoundCount = ids.length - allRoles.length
    
    resourceLogger.actionFlow({
      resource: "roles",
      action: "bulk-delete",
      step: "start",
      metadata: {
        requestedCount: ids.length,
        foundCount: roles.length,
        allRolesCount: allRoles.length,
        alreadyDeletedCount,
        notFoundCount,
        alreadyDeletedRoleIds: alreadyDeletedRoles.map(r => r.id),
        alreadyDeletedRoleNames: alreadyDeletedRoles.map(r => r.displayName),
        notFoundIds: ids.filter(id => !allRoles.some(r => r.id === id)),
      },
    })
    
    let errorMessage = "Không có vai trò nào có thể xóa"
    const parts: string[] = []
    if (alreadyDeletedCount > 0) {
      const roleNames = alreadyDeletedRoles.slice(0, 3).map(r => `"${r.displayName}"`).join(", ")
      const moreCount = alreadyDeletedCount > 3 ? ` và ${alreadyDeletedCount - 3} vai trò khác` : ""
      parts.push(`${alreadyDeletedCount} vai trò đã bị xóa trước đó: ${roleNames}${moreCount}`)
    }
    if (notFoundCount > 0) {
      parts.push(`${notFoundCount} vai trò không tồn tại`)
    }
    
    if (parts.length > 0) {
      errorMessage += ` (${parts.join(", ")})`
    }
    
    resourceLogger.actionFlow({
      resource: "roles",
      action: "bulk-delete",
      step: "error",
      metadata: {
        requestedCount: ids.length,
        foundCount: roles.length,
        alreadyDeletedCount,
        notFoundCount,
        error: errorMessage,
      },
    })
    
    throw new ApplicationError(errorMessage, 400)
  }

  const result = await prisma.role.updateMany({
    where: {
      id: { in: roles.map((role) => role.id) },
      deletedAt: null,
    },
    data: {
      deletedAt: new Date(),
      isActive: false,
    },
  })

  // Invalidate cache cho bulk operation - cần invalidate cả active và deleted views
  resourceLogger.cache({
    resource: "roles",
    action: "cache-invalidate",
    operation: "invalidate",
    tags: ["roles", "active-roles", "deleted-roles"],
  })
  await invalidateResourceCacheBulk({
    resource: "roles",
    additionalTags: ["active-roles", "deleted-roles"],
  })

  // Emit socket events và tạo bulk notification
  if (result.count > 0 && roles.length > 0) {
    // Emit events song song
    const emitPromises = roles.map((role) => 
      emitRoleUpsert(role.id, "active").catch((error) => {
        resourceLogger.socket({
          resource: "roles",
          action: "bulk-delete",
          event: "role:upsert",
          resourceId: role.id,
          payload: { 
            roleId: role.id, 
            roleName: role.name,
            error: error instanceof Error ? error.message : String(error),
          },
        })
        return null
      })
    )
    await Promise.allSettled(emitPromises)

    // Tạo bulk notification với tên records
    await notifySuperAdminsOfBulkRoleAction(
      "delete",
      ctx.actorId,
      result.count,
      roles
    )

    resourceLogger.actionFlow({
      resource: "roles",
      action: "bulk-delete",
      step: "success",
      duration: Date.now() - startTime,
      metadata: { requestedCount: ids.length, affectedCount: result.count },
    })
  }

  return { success: true, message: `Đã xóa ${result.count} vai trò`, affected: result.count }
}

export async function restoreRole(ctx: AuthContext, id: string): Promise<void> {
  const startTime = Date.now()
  
  resourceLogger.actionFlow({
    resource: "roles",
    action: "restore",
    step: "start",
    metadata: { roleId: id, actorId: ctx.actorId },
  })

  ensurePermission(ctx, PERMISSIONS.ROLES_UPDATE, PERMISSIONS.ROLES_MANAGE)

  const role = await prisma.role.findUnique({ where: { id } })
  if (!role || !role.deletedAt) {
    resourceLogger.actionFlow({
      resource: "roles",
      action: "restore",
      step: "error",
      metadata: { roleId: id, error: "Vai trò không tồn tại hoặc chưa bị xóa" },
    })
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

  // Invalidate cache - cần invalidate cả active và deleted views
  resourceLogger.cache({
    resource: "roles",
    action: "cache-invalidate",
    operation: "invalidate",
    resourceId: id,
    tags: ["roles", `role-${id}`, "active-roles", "deleted-roles"],
  })
  await invalidateResourceCache({
    resource: "roles",
    id,
    additionalTags: ["active-roles", "deleted-roles"],
  })

  // Emit socket event for real-time updates
  resourceLogger.socket({
    resource: "roles",
    action: "restore",
    event: "role:upsert",
    resourceId: id,
    payload: { roleId: id, previousStatus, newStatus: "active" },
  })
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

  resourceLogger.actionFlow({
    resource: "roles",
    action: "restore",
    step: "success",
    duration: Date.now() - startTime,
    metadata: { roleId: id, roleName: role.name, roleDisplayName: role.displayName },
  })
}

export async function bulkRestoreRoles(ctx: AuthContext, ids: string[]): Promise<BulkActionResult> {
  const startTime = Date.now()
  
  resourceLogger.actionFlow({
    resource: "roles",
    action: "bulk-restore",
    step: "start",
    metadata: { count: ids.length, roleIds: ids, actorId: ctx.actorId },
  })

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

  // Phân loại roles - sử dụng cách so sánh chính xác hơn
  // deletedAt có thể là Date object hoặc null, cần check cả undefined
  const softDeletedRoles = allRequestedRoles.filter((role) => {
    const isDeleted = role.deletedAt !== null && role.deletedAt !== undefined
    return isDeleted
  })
  const activeRoles = allRequestedRoles.filter((role) => {
    const isActive = role.deletedAt === null || role.deletedAt === undefined
    return isActive
  })
  const notFoundCount = ids.length - allRequestedRoles.length
  const foundIds = allRequestedRoles.map(r => r.id)
  const notFoundIds = ids.filter(id => !foundIds.includes(id))
  const softDeletedIds = softDeletedRoles.map(r => r.id)
  const activeIds = activeRoles.map(r => r.id)

  // Log chi tiết để debug - bao gồm deletedAt values
  resourceLogger.actionFlow({
    resource: "roles",
    action: "bulk-restore",
    step: "start",
    metadata: {
      requestedCount: ids.length,
      foundCount: allRequestedRoles.length,
      softDeletedCount: softDeletedRoles.length,
      activeCount: activeRoles.length,
      notFoundCount,
      requestedIds: ids,
      foundIds,
      softDeletedIds,
      activeIds,
      notFoundIds,
      // Log chi tiết deletedAt values để debug
      allRequestedRolesDetails: allRequestedRoles.map(r => ({
        id: r.id,
        name: r.name,
        deletedAt: r.deletedAt,
        deletedAtType: typeof r.deletedAt,
        deletedAtIsNull: r.deletedAt === null,
        deletedAtIsNotNull: r.deletedAt !== null,
      })),
    },
  })

  // Nếu không có role nào đã bị soft delete, throw error với message chi tiết
  if (softDeletedRoles.length === 0) {
    const parts: string[] = []
    if (activeRoles.length > 0) {
      parts.push(`${activeRoles.length} vai trò đang hoạt động`)
    }
    if (notFoundCount > 0) {
      parts.push(`${notFoundCount} vai trò không tồn tại (đã bị xóa vĩnh viễn)`)
    }

    const errorMessage = parts.length > 0
      ? `Không có vai trò nào để khôi phục (${parts.join(", ")})`
      : `Không tìm thấy vai trò nào để khôi phục`

    resourceLogger.actionFlow({
      resource: "roles",
      action: "bulk-restore",
      step: "error",
      metadata: {
        requestedCount: ids.length,
        foundCount: allRequestedRoles.length,
        softDeletedCount: softDeletedRoles.length,
        activeCount: activeRoles.length,
        notFoundCount,
        error: errorMessage,
      },
    })

    throw new ApplicationError(errorMessage, 400)
  }

  // Chỉ restore các roles đã bị soft delete
  const rolesToRestore = softDeletedRoles
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

  // Invalidate cache cho bulk operation - cần invalidate cả active và deleted views
  resourceLogger.cache({
    resource: "roles",
    action: "cache-invalidate",
    operation: "invalidate",
    tags: ["roles", "active-roles", "deleted-roles"],
  })
  await invalidateResourceCacheBulk({
    resource: "roles",
    additionalTags: ["active-roles", "deleted-roles"],
  })

  // Emit socket events và tạo bulk notification
  if (result.count > 0 && rolesToRestore.length > 0) {
    // Emit events song song
    const emitPromises = rolesToRestore.map((role) => 
      emitRoleUpsert(role.id, "deleted").catch((error) => {
        resourceLogger.socket({
          resource: "roles",
          action: "bulk-restore",
          event: "role:upsert",
          resourceId: role.id,
          payload: { 
            roleId: role.id, 
            roleName: role.name,
            error: error instanceof Error ? error.message : String(error),
          },
        })
        return null
      })
    )
    await Promise.allSettled(emitPromises)

    // Tạo bulk notification với tên records
    await notifySuperAdminsOfBulkRoleAction(
      "restore",
      ctx.actorId,
      result.count,
      rolesToRestore
    )

    resourceLogger.actionFlow({
      resource: "roles",
      action: "bulk-restore",
      step: "success",
      duration: Date.now() - startTime,
      metadata: { requestedCount: ids.length, affectedCount: result.count },
    })
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
  const startTime = Date.now()
  
  resourceLogger.actionFlow({
    resource: "roles",
    action: "hard-delete",
    step: "start",
    metadata: { roleId: id, actorId: ctx.actorId },
  })

  if (!canPerformAnyAction(ctx.permissions, ctx.roles, [PERMISSIONS.ROLES_MANAGE])) {
    throw new ForbiddenError()
  }

  const role = await prisma.role.findUnique({
    where: { id },
    select: { id: true, name: true, displayName: true, deletedAt: true },
  })

  if (!role) {
    resourceLogger.actionFlow({
      resource: "roles",
      action: "hard-delete",
      step: "error",
      metadata: { roleId: id, error: "Vai trò không tồn tại" },
    })
    throw new NotFoundError("Vai trò không tồn tại")
  }

  // Prevent deleting super_admin role
  if (role.name === "super_admin") {
    resourceLogger.actionFlow({
      resource: "roles",
      action: "hard-delete",
      step: "error",
      metadata: { roleId: id, roleName: role.name, error: "Không thể xóa vĩnh viễn vai trò super_admin" },
    })
    throw new ApplicationError("Không thể xóa vĩnh viễn vai trò super_admin", 400)
  }

  const previousStatus: "active" | "deleted" = role.deletedAt ? "deleted" : "active"

  await prisma.role.delete({
    where: { id },
  })

  // Invalidate cache - cần invalidate cả active và deleted views
  resourceLogger.cache({
    resource: "roles",
    action: "cache-invalidate",
    operation: "invalidate",
    resourceId: id,
    tags: ["roles", `role-${id}`, "active-roles", "deleted-roles"],
  })
  await invalidateResourceCache({
    resource: "roles",
    id,
    additionalTags: ["active-roles", "deleted-roles"],
  })

  // Emit socket event for real-time updates
  resourceLogger.socket({
    resource: "roles",
    action: "hard-delete",
    event: "role:remove",
    resourceId: id,
    payload: { roleId: id, previousStatus },
  })
  emitRoleRemove(id, previousStatus)

  // Emit notification realtime
  await notifySuperAdminsOfRoleAction(
    "hard-delete",
    ctx.actorId,
    role
  )

  resourceLogger.actionFlow({
    resource: "roles",
    action: "hard-delete",
    step: "success",
    duration: Date.now() - startTime,
    metadata: { roleId: id, roleName: role.name, roleDisplayName: role.displayName },
  })
}

export async function bulkHardDeleteRoles(ctx: AuthContext, ids: string[]): Promise<BulkActionResult> {
  const startTime = Date.now()
  
  resourceLogger.actionFlow({
    resource: "roles",
    action: "bulk-hard-delete",
    step: "start",
    metadata: { count: ids.length, roleIds: ids, actorId: ctx.actorId },
  })

  if (!canPerformAnyAction(ctx.permissions, ctx.roles, [PERMISSIONS.ROLES_MANAGE])) {
    throw new ForbiddenError()
  }

  if (!ids || ids.length === 0) {
    throw new ApplicationError("Danh sách vai trò trống", 400)
  }

  // Lấy thông tin roles trước khi delete để tạo notifications
  const roles = await prisma.role.findMany({
    where: {
      id: { in: ids },
    },
    select: { id: true, name: true, displayName: true, deletedAt: true },
  })

  const foundIds = roles.map(r => r.id)
  const notFoundIds = ids.filter(id => !foundIds.includes(id))
  
  // Log để debug với đầy đủ thông tin
  resourceLogger.actionFlow({
    resource: "roles",
    action: "bulk-hard-delete",
    step: "start",
    metadata: {
      requestedCount: ids.length,
      foundCount: roles.length,
      notFoundCount: notFoundIds.length,
      requestedIds: ids,
      foundIds,
      notFoundIds,
    },
  })

  // Check if any role is super_admin
  const superAdminRole = roles.find((r) => r.name === "super_admin")
  if (superAdminRole) {
    const errorMessage = "Không thể xóa vĩnh viễn vai trò super_admin"
    resourceLogger.actionFlow({
      resource: "roles",
      action: "bulk-hard-delete",
      step: "error",
      metadata: {
        requestedCount: ids.length,
        foundCount: roles.length,
        error: errorMessage,
        superAdminRoleId: superAdminRole.id,
      },
    })
    throw new ApplicationError(errorMessage, 400)
  }

  // Nếu không tìm thấy role nào, throw error
  if (roles.length === 0) {
    const errorMessage = `Không tìm thấy vai trò nào để xóa vĩnh viễn`
    resourceLogger.actionFlow({
      resource: "roles",
      action: "bulk-hard-delete",
      step: "error",
      metadata: {
        requestedCount: ids.length,
        foundCount: roles.length,
        notFoundCount: notFoundIds.length,
        error: errorMessage,
      },
    })
    throw new ApplicationError(errorMessage, 400)
  }

  const result = await prisma.role.deleteMany({
    where: {
      id: { in: roles.map((role) => role.id) },
    },
  })

  // Invalidate cache cho bulk operation - cần invalidate cả active và deleted views
  resourceLogger.cache({
    resource: "roles",
    action: "cache-invalidate",
    operation: "invalidate",
    tags: ["roles", "active-roles", "deleted-roles"],
  })
  await invalidateResourceCacheBulk({
    resource: "roles",
    additionalTags: ["active-roles", "deleted-roles"],
  })

  // Emit socket events và tạo bulk notification
  if (result.count > 0 && roles.length > 0) {
    // Emit events (emitRoleRemove trả về void, không phải Promise)
    roles.forEach((role) => {
      const previousStatus: "active" | "deleted" = role.deletedAt ? "deleted" : "active"
      try {
        emitRoleRemove(role.id, previousStatus)
      } catch (error) {
        resourceLogger.socket({
          resource: "roles",
          action: "bulk-hard-delete",
          event: "role:remove",
          resourceId: role.id,
          payload: { 
            roleId: role.id, 
            roleName: role.name,
            error: error instanceof Error ? error.message : String(error),
          },
        })
      }
    })

    // Tạo bulk notification với tên records
    await notifySuperAdminsOfBulkRoleAction(
      "hard-delete",
      ctx.actorId,
      result.count,
      roles
    )

    resourceLogger.actionFlow({
      resource: "roles",
      action: "bulk-hard-delete",
      step: "success",
      duration: Date.now() - startTime,
      metadata: { requestedCount: ids.length, affectedCount: result.count },
    })
  }

  return { success: true, message: `Đã xóa vĩnh viễn ${result.count} vai trò`, affected: result.count }
}

