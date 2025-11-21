"use server"

import bcrypt from "bcryptjs"
import type { Prisma } from "@prisma/client"
import { PERMISSIONS, canPerformAnyAction } from "@/lib/permissions"
import { prisma } from "@/lib/database"
import { mapUserRecord, type ListedUser, type UserWithRoles } from "./queries"
import { notifySuperAdminsOfUserAction } from "./notifications"
import {
  ApplicationError,
  ForbiddenError,
  NotFoundError,
  ensurePermission,
  type AuthContext,
} from "@/features/admin/resources/server"
import { emitUserUpsert, emitUserRemove } from "./events"
import { createUserSchema, updateUserSchema, type CreateUserSchema, type UpdateUserSchema } from "./validation"

// Re-export for backward compatibility with API routes
export { ApplicationError, ForbiddenError, NotFoundError, type AuthContext }

// Email của super admin không được phép xóa
const PROTECTED_SUPER_ADMIN_EMAIL = "superadmin@hub.edu.vn"

export interface BulkActionResult {
  count: number
}

function sanitizeUser(user: UserWithRoles): ListedUser {
  return mapUserRecord(user)
}

export async function createUser(ctx: AuthContext, input: CreateUserSchema): Promise<ListedUser> {
  ensurePermission(ctx, PERMISSIONS.USERS_CREATE, PERMISSIONS.USERS_MANAGE)

  // Validate input với zod
  const validatedInput = createUserSchema.parse(input)

  const existing = await prisma.user.findUnique({ where: { email: validatedInput.email } })
  if (existing) {
    throw new ApplicationError("Email đã tồn tại", 400)
  }

  const passwordHash = await bcrypt.hash(validatedInput.password, 10)

  const user = await prisma.user.create({
    data: {
      email: validatedInput.email,
      name: validatedInput.name ?? null,
      password: passwordHash,
      isActive: validatedInput.isActive ?? true,
      bio: validatedInput.bio,
      phone: validatedInput.phone,
      address: validatedInput.address,
      userRoles: validatedInput.roleIds && validatedInput.roleIds.length > 0
        ? {
            create: validatedInput.roleIds.map((roleId) => ({
              roleId,
            })),
          }
        : undefined,
    },
    include: {
      userRoles: {
        include: {
          role: {
            select: {
              id: true,
              name: true,
              displayName: true,
            },
          },
        },
      },
    },
  })

  // Tạo system notification cho super admin
  await notifySuperAdminsOfUserAction(
    "create",
    ctx.actorId,
    {
      id: user.id,
      email: user.email,
      name: user.name,
    }
  )

  // Emit socket event
  await emitUserUpsert(user.id, null)

  return sanitizeUser(user)
}

export async function updateUser(ctx: AuthContext, id: string, input: UpdateUserSchema): Promise<ListedUser> {
  ensurePermission(ctx, PERMISSIONS.USERS_UPDATE, PERMISSIONS.USERS_MANAGE)

  // Validate ID
  if (!id || typeof id !== "string" || id.trim() === "") {
    throw new ApplicationError("ID người dùng không hợp lệ", 400)
  }

  // Validate input với zod
  const validatedInput = updateUserSchema.parse(input)

  const existing = await prisma.user.findUnique({
    where: { id },
    include: {
      userRoles: {
        include: {
          role: true,
        },
      },
    },
  })

  if (!existing || existing.deletedAt) {
    throw new NotFoundError("User không tồn tại")
  }

  // Check if email is already used by another user
  if (validatedInput.email !== undefined && validatedInput.email !== existing.email) {
    const emailExists = await prisma.user.findUnique({ where: { email: validatedInput.email } })
    if (emailExists) {
      throw new ApplicationError("Email đã được sử dụng", 400)
    }
  }

  // Validate roleIds if provided - check if roles exist
  if (validatedInput.roleIds !== undefined && validatedInput.roleIds.length > 0) {
    const roles = await prisma.role.findMany({
      where: { id: { in: validatedInput.roleIds } },
      select: { id: true },
    })
    if (roles.length !== validatedInput.roleIds.length) {
      throw new ApplicationError("Một số vai trò không tồn tại", 400)
    }
  }

  const updateData: Prisma.UserUpdateInput = {}

  // Track changes để tạo notification
  const changes: {
    email?: { old: string; new: string }
    isActive?: { old: boolean; new: boolean }
    roles?: { old: string[]; new: string[] }
  } = {}

  if (validatedInput.email !== undefined) {
    const newEmail = validatedInput.email.trim()
    if (newEmail !== existing.email) {
      changes.email = { old: existing.email, new: newEmail }
      updateData.email = newEmail
    }
  }
  if (validatedInput.name !== undefined) updateData.name = validatedInput.name?.trim() || null
  if (validatedInput.isActive !== undefined) {
    // Không cho phép vô hiệu hóa super admin
    if (existing.email === PROTECTED_SUPER_ADMIN_EMAIL && validatedInput.isActive === false) {
      throw new ForbiddenError("Không thể vô hiệu hóa tài khoản super admin")
    }
    
    // Track isActive changes
    if (validatedInput.isActive !== existing.isActive) {
      changes.isActive = { old: existing.isActive, new: validatedInput.isActive }
    }
    updateData.isActive = validatedInput.isActive
  }
  if (validatedInput.bio !== undefined) updateData.bio = validatedInput.bio?.trim() || null
  if (validatedInput.phone !== undefined) updateData.phone = validatedInput.phone?.trim() || null
  if (validatedInput.address !== undefined) updateData.address = validatedInput.address?.trim() || null
  if (validatedInput.password && validatedInput.password.trim() !== "") {
    updateData.password = await bcrypt.hash(validatedInput.password, 10)
  }

  const shouldUpdateRoles = Array.isArray(validatedInput.roleIds)
  
  // Track role changes
  if (shouldUpdateRoles) {
    const oldRoleNames = existing.userRoles.map((ur) => ur.role.name).sort()
    // Get new role names
    const newRoleIds = validatedInput.roleIds || []
    const newRoles = await prisma.role.findMany({
      where: { id: { in: newRoleIds } },
      select: { name: true },
    })
    const newRoleNames = newRoles.map((r) => r.name).sort()
    
    if (JSON.stringify(oldRoleNames) !== JSON.stringify(newRoleNames)) {
      changes.roles = { old: oldRoleNames, new: newRoleNames }
    }
  }

  const user = await prisma.$transaction(async (tx) => {
    if (Object.keys(updateData).length > 0) {
      await tx.user.update({
        where: { id },
        data: updateData,
      })
    }

    if (shouldUpdateRoles) {
      await tx.userRole.deleteMany({
        where: { userId: id },
      })

      if (validatedInput.roleIds && validatedInput.roleIds.length > 0) {
        await tx.userRole.createMany({
          data: validatedInput.roleIds.map((roleId) => ({
            userId: id,
            roleId,
          })),
        })
      }
    }

    const updated = await tx.user.findUnique({
      where: { id },
      include: {
        userRoles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
                displayName: true,
              },
            },
          },
        },
      },
    })

    if (!updated) {
      throw new NotFoundError("User không tồn tại")
    }

    return updated
  })

  // Tạo system notification cho super admin nếu có thay đổi quan trọng
  if (Object.keys(changes).length > 0) {
    await notifySuperAdminsOfUserAction(
      "update",
      ctx.actorId,
      {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      changes
    )
  }

  // Emit socket event
  const previousStatus: "active" | "deleted" = existing.deletedAt ? "deleted" : "active"
  await emitUserUpsert(user.id, previousStatus)

  return sanitizeUser(user)
}

export async function softDeleteUser(ctx: AuthContext, id: string): Promise<void> {
  ensurePermission(ctx, PERMISSIONS.USERS_DELETE, PERMISSIONS.USERS_MANAGE)

  const user = await prisma.user.findUnique({ where: { id } })
  if (!user || user.deletedAt) {
    throw new NotFoundError("User không tồn tại")
  }

  // Không cho phép xóa super admin
  if (user.email === PROTECTED_SUPER_ADMIN_EMAIL) {
    throw new ForbiddenError("Không thể xóa tài khoản super admin")
  }

  await prisma.user.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      isActive: false,
    },
  })

  // Tạo system notification cho super admin
  await notifySuperAdminsOfUserAction(
    "delete",
    ctx.actorId,
    {
      id: user.id,
      email: user.email,
      name: user.name,
    }
  )

  // Emit socket event
  await emitUserUpsert(id, "active")
}

export async function bulkSoftDeleteUsers(ctx: AuthContext, ids: string[]): Promise<BulkActionResult> {
  ensurePermission(ctx, PERMISSIONS.USERS_DELETE, PERMISSIONS.USERS_MANAGE)

  if (!ids || ids.length === 0) {
    throw new ApplicationError("Danh sách người dùng trống", 400)
  }

  // Lấy thông tin users trước khi delete để kiểm tra và tạo notifications
  const users = await prisma.user.findMany({
    where: {
      id: { in: ids },
      deletedAt: null,
    },
    select: { id: true, email: true, name: true },
  })

  // Kiểm tra xem có super admin trong danh sách không
  const superAdminUser = users.find((u) => u.email === PROTECTED_SUPER_ADMIN_EMAIL)
  if (superAdminUser) {
    throw new ForbiddenError("Không thể xóa tài khoản super admin")
  }

  // Filter ra super admin từ danh sách IDs (nếu có)
  const filteredIds = users
    .filter((u) => u.email !== PROTECTED_SUPER_ADMIN_EMAIL)
    .map((u) => u.id)

  if (filteredIds.length === 0) {
    throw new ApplicationError("Không có người dùng nào có thể xóa", 400)
  }

  const result = await prisma.user.updateMany({
    where: {
      id: { in: filteredIds },
      deletedAt: null,
    },
    data: {
      deletedAt: new Date(),
      isActive: false,
    },
  })

  // Emit socket events để update UI - await song song để đảm bảo tất cả events được emit
  // Sử dụng Promise.allSettled để không bị fail nếu một event lỗi
  const deletableUsers = users.filter((u) => u.email !== PROTECTED_SUPER_ADMIN_EMAIL)
  if (result.count > 0) {
    // Emit events song song và await tất cả để đảm bảo hoàn thành
    const emitPromises = deletableUsers.map((user) => 
      emitUserUpsert(user.id, "active").catch((error) => {
        console.error(`Failed to emit user:upsert for ${user.id}:`, error)
        return null // Return null để Promise.allSettled không throw
      })
    )
    // Await tất cả events nhưng không fail nếu một số lỗi
    await Promise.allSettled(emitPromises)

    // Tạo system notifications cho từng user
    for (const user of deletableUsers) {
      await notifySuperAdminsOfUserAction(
        "delete",
        ctx.actorId,
        {
          id: user.id,
          email: user.email,
          name: user.name,
        }
      )
    }
  }

  return { count: result.count }
}

export async function restoreUser(ctx: AuthContext, id: string): Promise<void> {
  ensurePermission(ctx, PERMISSIONS.USERS_UPDATE, PERMISSIONS.USERS_MANAGE)

  const user = await prisma.user.findUnique({ where: { id } })
  if (!user || !user.deletedAt) {
    throw new NotFoundError("User không tồn tại hoặc chưa bị xóa")
  }

  await prisma.user.update({
    where: { id },
    data: {
      deletedAt: null,
      isActive: true,
    },
  })

  // Tạo system notification cho super admin
  await notifySuperAdminsOfUserAction(
    "restore",
    ctx.actorId,
    {
      id: user.id,
      email: user.email,
      name: user.name,
    }
  )

  // Emit socket event
  await emitUserUpsert(id, "deleted")
}

export async function bulkRestoreUsers(ctx: AuthContext, ids: string[]): Promise<BulkActionResult> {
  ensurePermission(ctx, PERMISSIONS.USERS_UPDATE, PERMISSIONS.USERS_MANAGE)

  if (!ids || ids.length === 0) {
    throw new ApplicationError("Danh sách người dùng trống", 400)
  }

  // Lấy thông tin users trước khi restore để tạo notifications
  const users = await prisma.user.findMany({
    where: {
      id: { in: ids },
      deletedAt: { not: null },
    },
    select: { id: true, email: true, name: true },
  })

  const result = await prisma.user.updateMany({
    where: {
      id: { in: ids },
      deletedAt: { not: null },
    },
    data: {
      deletedAt: null,
      isActive: true,
    },
  })

  // Emit socket events để update UI - await song song để đảm bảo tất cả events được emit
  // Sử dụng Promise.allSettled để không bị fail nếu một event lỗi
  if (result.count > 0) {
    // Emit events song song và await tất cả để đảm bảo hoàn thành
    const emitPromises = users.map((user) => 
      emitUserUpsert(user.id, "deleted").catch((error) => {
        console.error(`Failed to emit user:upsert for ${user.id}:`, error)
        return null // Return null để Promise.allSettled không throw
      })
    )
    // Await tất cả events nhưng không fail nếu một số lỗi
    await Promise.allSettled(emitPromises)

    // Tạo system notifications cho từng user
    for (const user of users) {
      await notifySuperAdminsOfUserAction(
        "restore",
        ctx.actorId,
        {
          id: user.id,
          email: user.email,
          name: user.name,
        }
      )
    }
  }

  return { count: result.count }
}

export async function hardDeleteUser(ctx: AuthContext, id: string): Promise<void> {
  if (!canPerformAnyAction(ctx.permissions, ctx.roles, [PERMISSIONS.USERS_MANAGE])) {
    throw new ForbiddenError()
  }

  // Lấy thông tin user trước khi delete để kiểm tra và tạo notification
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, deletedAt: true },
  })

  if (!user) {
    throw new NotFoundError("User không tồn tại")
  }

  // Không cho phép xóa super admin
  if (user.email === PROTECTED_SUPER_ADMIN_EMAIL) {
    throw new ForbiddenError("Không thể xóa vĩnh viễn tài khoản super admin")
  }

  await prisma.user.delete({
    where: { id },
  })

  // Tạo system notification cho super admin
  await notifySuperAdminsOfUserAction(
    "hard-delete",
    ctx.actorId,
    {
      id: user.id,
      email: user.email,
      name: user.name,
    }
  )

  // Emit socket event - cần lấy previousStatus trước khi delete
  const previousStatus: "active" | "deleted" = user.deletedAt ? "deleted" : "active"
  emitUserRemove(id, previousStatus)
}

export async function bulkHardDeleteUsers(ctx: AuthContext, ids: string[]): Promise<BulkActionResult> {
  if (!canPerformAnyAction(ctx.permissions, ctx.roles, [PERMISSIONS.USERS_MANAGE])) {
    throw new ForbiddenError()
  }

  if (!ids || ids.length === 0) {
    throw new ApplicationError("Danh sách người dùng trống", 400)
  }

  // Lấy thông tin users trước khi delete để kiểm tra và tạo notifications
  const users = await prisma.user.findMany({
    where: {
      id: { in: ids },
    },
    select: { id: true, email: true, name: true, deletedAt: true },
  })

  // Kiểm tra xem có super admin trong danh sách không
  const superAdminUser = users.find((u) => u.email === PROTECTED_SUPER_ADMIN_EMAIL)
  if (superAdminUser) {
    throw new ForbiddenError("Không thể xóa vĩnh viễn tài khoản super admin")
  }

  // Filter ra super admin từ danh sách IDs (nếu có)
  const filteredIds = users
    .filter((u) => u.email !== PROTECTED_SUPER_ADMIN_EMAIL)
    .map((u) => u.id)

  if (filteredIds.length === 0) {
    throw new ApplicationError("Không có người dùng nào có thể xóa", 400)
  }

  const result = await prisma.user.deleteMany({
    where: {
      id: { in: filteredIds },
    },
  })

  // Tạo system notifications cho từng user và emit socket events
  for (const user of users.filter((u) => u.email !== PROTECTED_SUPER_ADMIN_EMAIL)) {
    await notifySuperAdminsOfUserAction(
      "hard-delete",
      ctx.actorId,
      {
        id: user.id,
        email: user.email,
        name: user.name,
      }
    )
    // Emit socket event cho từng user - cần previousStatus trước khi delete
    const previousStatus: "active" | "deleted" = user.deletedAt ? "deleted" : "active"
    emitUserRemove(user.id, previousStatus)
  }

  return { count: result.count }
}
