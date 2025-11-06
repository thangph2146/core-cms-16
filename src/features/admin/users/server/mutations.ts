import bcrypt from "bcryptjs"
import type { Prisma } from "@prisma/client"
import type { Permission } from "@/lib/permissions"
import { PERMISSIONS, canPerformAction, canPerformAnyAction } from "@/lib/permissions"
import { prisma } from "@/lib/database"
import { mapUserRecord, type ListedUser, type UserWithRoles } from "./queries"
import { notifySuperAdminsOfUserAction } from "./notifications"

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

export interface CreateUserInput {
  email: string
  password: string
  name?: string | null
  roleIds?: string[]
  isActive?: boolean
  bio?: string | null
  phone?: string | null
  address?: string | null
}

export interface UpdateUserInput {
  email?: string
  password?: string
  name?: string | null
  roleIds?: string[]
  isActive?: boolean
  bio?: string | null
  phone?: string | null
  address?: string | null
}

export interface BulkActionResult {
  count: number
}

function ensurePermission(ctx: AuthContext, ...required: Permission[]) {
  const allowed = required.some((perm) => canPerformAction(ctx.permissions, ctx.roles, perm))
  if (!allowed) {
    throw new ForbiddenError()
  }
}

function sanitizeUser(user: UserWithRoles): ListedUser {
  return mapUserRecord(user)
}

export async function createUser(ctx: AuthContext, input: CreateUserInput): Promise<ListedUser> {
  ensurePermission(ctx, PERMISSIONS.USERS_CREATE, PERMISSIONS.USERS_MANAGE)

  if (!input.email || !input.password) {
    throw new ApplicationError("Email và mật khẩu là bắt buộc", 400)
  }

  const existing = await prisma.user.findUnique({ where: { email: input.email } })
  if (existing) {
    throw new ApplicationError("Email đã tồn tại", 400)
  }

  const passwordHash = await bcrypt.hash(input.password, 10)

  const user = await prisma.user.create({
    data: {
      email: input.email,
      name: input.name ?? null,
      password: passwordHash,
      isActive: input.isActive ?? true,
      bio: input.bio,
      phone: input.phone,
      address: input.address,
      userRoles: input.roleIds && input.roleIds.length > 0
        ? {
            create: input.roleIds.map((roleId) => ({
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

  return sanitizeUser(user)
}

export async function updateUser(ctx: AuthContext, id: string, input: UpdateUserInput): Promise<ListedUser> {
  ensurePermission(ctx, PERMISSIONS.USERS_UPDATE, PERMISSIONS.USERS_MANAGE)

  // Validate ID
  if (!id || typeof id !== "string" || id.trim() === "") {
    throw new ApplicationError("ID người dùng không hợp lệ", 400)
  }

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

  // Validate email if provided
  if (input.email !== undefined) {
    if (typeof input.email !== "string" || input.email.trim() === "") {
      throw new ApplicationError("Email không được để trống", 400)
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(input.email)) {
      throw new ApplicationError("Email không hợp lệ", 400)
    }

    // Check if email is already used by another user
    if (input.email !== existing.email) {
      const emailExists = await prisma.user.findUnique({ where: { email: input.email } })
      if (emailExists) {
        throw new ApplicationError("Email đã được sử dụng", 400)
      }
    }
  }

  // Validate name if provided
  if (input.name !== undefined && input.name !== null) {
    if (typeof input.name !== "string") {
      throw new ApplicationError("Tên phải là chuỗi ký tự", 400)
    }
    if (input.name.trim().length > 0 && input.name.trim().length < 2) {
      throw new ApplicationError("Tên phải có ít nhất 2 ký tự", 400)
    }
  }

  // Validate password if provided
  if (input.password !== undefined && input.password !== null && input.password !== "") {
    if (typeof input.password !== "string") {
      throw new ApplicationError("Mật khẩu phải là chuỗi ký tự", 400)
    }
    if (input.password.length < 6) {
      throw new ApplicationError("Mật khẩu phải có ít nhất 6 ký tự", 400)
    }
  }

  // Validate roleIds if provided
  if (input.roleIds !== undefined) {
    if (!Array.isArray(input.roleIds)) {
      throw new ApplicationError("roleIds phải là một mảng", 400)
    }
    // Validate each roleId
    for (const roleId of input.roleIds) {
      if (typeof roleId !== "string" || roleId.trim() === "") {
        throw new ApplicationError("Một số roleIds không hợp lệ", 400)
      }
      // Check if role exists
      const roleExists = await prisma.role.findUnique({ where: { id: roleId } })
      if (!roleExists) {
        throw new ApplicationError(`Vai trò với ID ${roleId} không tồn tại`, 400)
      }
    }
  }

  // Validate phone if provided
  if (input.phone !== undefined && input.phone !== null && input.phone !== "") {
    if (typeof input.phone !== "string") {
      throw new ApplicationError("Số điện thoại phải là chuỗi ký tự", 400)
    }
    // Basic phone validation (can be enhanced)
    const phoneRegex = /^[0-9+\-\s()]+$/
    if (!phoneRegex.test(input.phone)) {
      throw new ApplicationError("Số điện thoại không hợp lệ", 400)
    }
  }

  const updateData: Prisma.UserUpdateInput = {}

  // Track changes để tạo notification
  const changes: {
    email?: { old: string; new: string }
    isActive?: { old: boolean; new: boolean }
    roles?: { old: string[]; new: string[] }
  } = {}

  if (input.email !== undefined) {
    const newEmail = input.email.trim()
    if (newEmail !== existing.email) {
      changes.email = { old: existing.email, new: newEmail }
      updateData.email = newEmail
    }
  }
  if (input.name !== undefined) updateData.name = input.name?.trim() || null
  if (input.isActive !== undefined) {
    // Track isActive changes - luôn track ngay cả khi giá trị không đổi để đảm bảo notification được tạo
    if (input.isActive !== existing.isActive) {
      changes.isActive = { old: existing.isActive, new: input.isActive }
      console.log("[user-mutations] isActive change detected:", {
        userId: id,
        old: existing.isActive,
        new: input.isActive,
      })
    }
    updateData.isActive = input.isActive
  }
  if (input.bio !== undefined) updateData.bio = input.bio?.trim() || null
  if (input.phone !== undefined) updateData.phone = input.phone?.trim() || null
  if (input.address !== undefined) updateData.address = input.address?.trim() || null
  if (input.password && input.password.trim() !== "") {
    updateData.password = await bcrypt.hash(input.password, 10)
  }

  const shouldUpdateRoles = Array.isArray(input.roleIds)
  
  // Track role changes
  if (shouldUpdateRoles) {
    const oldRoleNames = existing.userRoles.map((ur) => ur.role.name).sort()
    // Get new role names
    const newRoleIds = input.roleIds || []
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

      if (input.roleIds && input.roleIds.length > 0) {
        await tx.userRole.createMany({
          data: input.roleIds.map((roleId) => ({
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
    console.log("[user-mutations] Creating notification for user update:", {
      userId: user.id,
      changes: Object.keys(changes),
      actorId: ctx.actorId,
    })
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
  } else {
    console.log("[user-mutations] No changes detected, skipping notification:", {
      userId: id,
      inputKeys: Object.keys(input),
    })
  }

  return sanitizeUser(user)
}

export async function softDeleteUser(ctx: AuthContext, id: string): Promise<void> {
  ensurePermission(ctx, PERMISSIONS.USERS_DELETE, PERMISSIONS.USERS_MANAGE)

  const user = await prisma.user.findUnique({ where: { id } })
  if (!user || user.deletedAt) {
    throw new NotFoundError("User không tồn tại")
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
}

export async function bulkSoftDeleteUsers(ctx: AuthContext, ids: string[]): Promise<BulkActionResult> {
  ensurePermission(ctx, PERMISSIONS.USERS_DELETE, PERMISSIONS.USERS_MANAGE)

  if (!ids || ids.length === 0) {
    throw new ApplicationError("Danh sách người dùng trống", 400)
  }

  // Lấy thông tin users trước khi delete để tạo notifications
  const users = await prisma.user.findMany({
    where: {
      id: { in: ids },
      deletedAt: null,
    },
    select: { id: true, email: true, name: true },
  })

  const result = await prisma.user.updateMany({
    where: {
      id: { in: ids },
      deletedAt: null,
    },
    data: {
      deletedAt: new Date(),
      isActive: false,
    },
  })

  // Tạo system notifications cho từng user
  for (const user of users) {
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

  return { count: result.count }
}

export async function hardDeleteUser(ctx: AuthContext, id: string): Promise<void> {
  if (!canPerformAnyAction(ctx.permissions, ctx.roles, [PERMISSIONS.USERS_MANAGE])) {
    throw new ForbiddenError()
  }

  // Lấy thông tin user trước khi delete để tạo notification
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true },
  })

  await prisma.user.delete({
    where: { id },
  })

  // Tạo system notification cho super admin
  if (user) {
    await notifySuperAdminsOfUserAction(
      "hard-delete",
      ctx.actorId,
      {
        id: user.id,
        email: user.email,
        name: user.name,
      }
    )
  }
}

export async function bulkHardDeleteUsers(ctx: AuthContext, ids: string[]): Promise<BulkActionResult> {
  if (!canPerformAnyAction(ctx.permissions, ctx.roles, [PERMISSIONS.USERS_MANAGE])) {
    throw new ForbiddenError()
  }

  if (!ids || ids.length === 0) {
    throw new ApplicationError("Danh sách người dùng trống", 400)
  }

  // Lấy thông tin users trước khi delete để tạo notifications
  const users = await prisma.user.findMany({
    where: {
      id: { in: ids },
    },
    select: { id: true, email: true, name: true },
  })

  const result = await prisma.user.deleteMany({
    where: {
      id: { in: ids },
    },
  })

  // Tạo system notifications cho từng user
  for (const user of users) {
    await notifySuperAdminsOfUserAction(
      "hard-delete",
      ctx.actorId,
      {
        id: user.id,
        email: user.email,
        name: user.name,
      }
    )
  }

  return { count: result.count }
}
