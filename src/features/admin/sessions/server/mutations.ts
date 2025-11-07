import type { Prisma } from "@prisma/client"
import { PERMISSIONS, canPerformAnyAction } from "@/lib/permissions"
import { prisma } from "@/lib/database"
import { mapSessionRecord, type SessionWithRelations } from "./helpers"
import type { ListedSession } from "../types"
import type { BulkActionResult } from "../types"
import {
  CreateSessionSchema,
  UpdateSessionSchema,
  BulkSessionActionSchema,
} from "./schemas"
import { notifySuperAdminsOfSessionAction } from "./notifications"
import {
  ApplicationError,
  ForbiddenError,
  NotFoundError,
  ensurePermission,
  type AuthContext,
} from "@/features/admin/resources/server"

// Re-export for backward compatibility with API routes
export { ApplicationError, ForbiddenError, NotFoundError, type AuthContext }

function sanitizeSession(session: SessionWithRelations): ListedSession {
  return mapSessionRecord(session)
}

export async function createSession(ctx: AuthContext, input: unknown): Promise<ListedSession> {
  ensurePermission(ctx, PERMISSIONS.SESSIONS_CREATE, PERMISSIONS.SESSIONS_MANAGE)

  // Validate input với zod
  const validationResult = CreateSessionSchema.safeParse(input)
  if (!validationResult.success) {
    const firstError = validationResult.error.issues[0]
    throw new ApplicationError(firstError?.message || "Dữ liệu không hợp lệ", 400)
  }

  const validatedInput = validationResult.data

  // Check if accessToken or refreshToken already exists
  const existing = await prisma.session.findFirst({
    where: {
      OR: [
        { accessToken: validatedInput.accessToken },
        { refreshToken: validatedInput.refreshToken },
      ],
      isActive: true,
    },
  })

  if (existing) {
    throw new ApplicationError("Access token hoặc refresh token đã tồn tại", 400)
  }

  const session = await prisma.session.create({
    data: {
      userId: validatedInput.userId,
      accessToken: validatedInput.accessToken,
      refreshToken: validatedInput.refreshToken,
      userAgent: validatedInput.userAgent?.trim() || null,
      ipAddress: validatedInput.ipAddress?.trim() || null,
      isActive: validatedInput.isActive ?? true,
      expiresAt: new Date(validatedInput.expiresAt),
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })

  const sanitized = sanitizeSession(session)

  // Emit notification realtime
  await notifySuperAdminsOfSessionAction(
    "create",
    ctx.actorId,
    {
      id: sanitized.id,
      userId: sanitized.userId,
      accessToken: sanitized.accessToken,
    }
  )

  return sanitized
}

export async function updateSession(ctx: AuthContext, id: string, input: unknown): Promise<ListedSession> {
  ensurePermission(ctx, PERMISSIONS.SESSIONS_UPDATE, PERMISSIONS.SESSIONS_MANAGE)

  if (!id || typeof id !== "string" || id.trim() === "") {
    throw new ApplicationError("ID session không hợp lệ", 400)
  }

  // Validate input với zod
  const validationResult = UpdateSessionSchema.safeParse(input)
  if (!validationResult.success) {
    const firstError = validationResult.error.issues[0]
    throw new ApplicationError(firstError?.message || "Dữ liệu không hợp lệ", 400)
  }

  const validatedInput = validationResult.data

  const existing = await prisma.session.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })

  if (!existing) {
    throw new NotFoundError("Session không tồn tại")
  }

  // Track changes for notification
  const changes: {
    userId?: { old: string; new: string }
    userAgent?: { old: string | null; new: string | null }
    ipAddress?: { old: string | null; new: string | null }
    isActive?: { old: boolean; new: boolean }
    expiresAt?: { old: string; new: string }
  } = {}

  const updateData: Prisma.SessionUpdateInput = {}

  if (validatedInput.userId !== undefined) {
    if (validatedInput.userId !== existing.userId) {
      changes.userId = { old: existing.userId, new: validatedInput.userId }
    }
    updateData.user = { connect: { id: validatedInput.userId } }
  }

  if (validatedInput.accessToken !== undefined) {
    // Check if accessToken is already used by another session
    if (validatedInput.accessToken !== existing.accessToken) {
      const tokenExists = await prisma.session.findFirst({
        where: {
          accessToken: validatedInput.accessToken,
          isActive: true,
          id: { not: id },
        },
      })
      if (tokenExists) {
        throw new ApplicationError("Access token đã được sử dụng", 400)
      }
    }
    updateData.accessToken = validatedInput.accessToken
  }

  if (validatedInput.refreshToken !== undefined) {
    // Check if refreshToken is already used by another session
    if (validatedInput.refreshToken !== existing.refreshToken) {
      const tokenExists = await prisma.session.findFirst({
        where: {
          refreshToken: validatedInput.refreshToken,
          isActive: true,
          id: { not: id },
        },
      })
      if (tokenExists) {
        throw new ApplicationError("Refresh token đã được sử dụng", 400)
      }
    }
    updateData.refreshToken = validatedInput.refreshToken
  }

  if (validatedInput.userAgent !== undefined) {
    const trimmedUserAgent = validatedInput.userAgent?.trim() || null
    if (trimmedUserAgent !== existing.userAgent) {
      changes.userAgent = { old: existing.userAgent, new: trimmedUserAgent }
    }
    updateData.userAgent = trimmedUserAgent
  }

  if (validatedInput.ipAddress !== undefined) {
    const trimmedIpAddress = validatedInput.ipAddress?.trim() || null
    if (trimmedIpAddress !== existing.ipAddress) {
      changes.ipAddress = { old: existing.ipAddress, new: trimmedIpAddress }
    }
    updateData.ipAddress = trimmedIpAddress
  }

  if (validatedInput.isActive !== undefined) {
    if (validatedInput.isActive !== existing.isActive) {
      changes.isActive = { old: existing.isActive, new: validatedInput.isActive }
    }
    updateData.isActive = validatedInput.isActive
  }

  if (validatedInput.expiresAt !== undefined) {
    const newExpiresAt = new Date(validatedInput.expiresAt)
    const oldExpiresAt = existing.expiresAt.toISOString()
    if (newExpiresAt.toISOString() !== oldExpiresAt) {
      changes.expiresAt = { old: oldExpiresAt, new: newExpiresAt.toISOString() }
    }
    updateData.expiresAt = newExpiresAt
  }

  const session = await prisma.session.update({
    where: { id },
    data: updateData,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })

  const sanitized = sanitizeSession(session)

  // Emit notification realtime
  await notifySuperAdminsOfSessionAction(
    "update",
    ctx.actorId,
    {
      id: sanitized.id,
      userId: sanitized.userId,
      accessToken: sanitized.accessToken,
    },
    Object.keys(changes).length > 0 ? changes : undefined
  )

  return sanitized
}

/**
 * Soft delete session: set isActive = false
 * Note: Session model không có deletedAt, sử dụng isActive=false để đánh dấu "deleted"
 */
export async function softDeleteSession(ctx: AuthContext, id: string): Promise<void> {
  ensurePermission(ctx, PERMISSIONS.SESSIONS_DELETE, PERMISSIONS.SESSIONS_MANAGE)

  const session = await prisma.session.findUnique({ where: { id } })
  if (!session || !session.isActive) {
    throw new NotFoundError("Session không tồn tại hoặc đã bị xóa")
  }

  await prisma.session.update({
    where: { id },
    data: {
      isActive: false,
    },
  })

  // Emit notification realtime
  await notifySuperAdminsOfSessionAction(
    "delete",
    ctx.actorId,
    {
      id: session.id,
      userId: session.userId,
      accessToken: session.accessToken,
    }
  )
}

export async function bulkSoftDeleteSessions(ctx: AuthContext, ids: string[]): Promise<BulkActionResult> {
  ensurePermission(ctx, PERMISSIONS.SESSIONS_DELETE, PERMISSIONS.SESSIONS_MANAGE)

  if (!ids || ids.length === 0) {
    throw new ApplicationError("Danh sách session trống", 400)
  }

  // Lấy thông tin sessions trước khi delete để tạo notifications
  const sessions = await prisma.session.findMany({
    where: {
      id: { in: ids },
      isActive: true,
    },
    select: { id: true, userId: true, accessToken: true },
  })

  const result = await prisma.session.updateMany({
    where: {
      id: { in: ids },
      isActive: true,
    },
    data: {
      isActive: false,
    },
  })

  // Emit notifications realtime cho từng session
  for (const session of sessions) {
    await notifySuperAdminsOfSessionAction(
      "delete",
      ctx.actorId,
      session
    )
  }

  return { success: true, message: `Đã xóa ${result.count} session`, affectedCount: result.count }
}

/**
 * Restore session: set isActive = true
 * Note: Session model không có deletedAt, sử dụng isActive=false để đánh dấu "deleted"
 */
export async function restoreSession(ctx: AuthContext, id: string): Promise<void> {
  ensurePermission(ctx, PERMISSIONS.SESSIONS_UPDATE, PERMISSIONS.SESSIONS_MANAGE)

  const session = await prisma.session.findUnique({ where: { id } })
  if (!session || session.isActive) {
    throw new NotFoundError("Session không tồn tại hoặc chưa bị xóa")
  }

  await prisma.session.update({
    where: { id },
    data: {
      isActive: true,
    },
  })

  // Emit notification realtime
  await notifySuperAdminsOfSessionAction(
    "restore",
    ctx.actorId,
    {
      id: session.id,
      userId: session.userId,
      accessToken: session.accessToken,
    }
  )
}

export async function bulkRestoreSessions(ctx: AuthContext, ids: string[]): Promise<BulkActionResult> {
  ensurePermission(ctx, PERMISSIONS.SESSIONS_UPDATE, PERMISSIONS.SESSIONS_MANAGE)

  if (!ids || ids.length === 0) {
    throw new ApplicationError("Danh sách session trống", 400)
  }

  // Lấy thông tin sessions trước khi restore để tạo notifications
  const sessions = await prisma.session.findMany({
    where: {
      id: { in: ids },
      isActive: false,
    },
    select: { id: true, userId: true, accessToken: true },
  })

  const result = await prisma.session.updateMany({
    where: {
      id: { in: ids },
      isActive: false,
    },
    data: {
      isActive: true,
    },
  })

  // Emit notifications realtime cho từng session
  for (const session of sessions) {
    await notifySuperAdminsOfSessionAction(
      "restore",
      ctx.actorId,
      session
    )
  }

  return { success: true, message: `Đã khôi phục ${result.count} session`, affectedCount: result.count }
}

/**
 * Hard delete session: xóa vĩnh viễn khỏi database
 * Note: Chỉ hard delete khi isActive=false (đã bị soft delete)
 */
export async function hardDeleteSession(ctx: AuthContext, id: string): Promise<void> {
  if (!canPerformAnyAction(ctx.permissions, ctx.roles, [PERMISSIONS.SESSIONS_MANAGE])) {
    throw new ForbiddenError()
  }

  const session = await prisma.session.findUnique({
    where: { id },
    select: { id: true, userId: true, accessToken: true, isActive: true },
  })

  if (!session) {
    throw new NotFoundError("Session không tồn tại")
  }

  // Chỉ hard delete khi isActive=false (đã bị soft delete)
  if (session.isActive) {
    throw new ApplicationError("Chỉ có thể xóa vĩnh viễn session đã bị xóa (isActive=false)", 400)
  }

  await prisma.session.delete({
    where: { id },
  })

  // Emit notification realtime
  await notifySuperAdminsOfSessionAction(
    "hard-delete",
    ctx.actorId,
    session
  )
}

export async function bulkHardDeleteSessions(ctx: AuthContext, ids: string[]): Promise<BulkActionResult> {
  if (!canPerformAnyAction(ctx.permissions, ctx.roles, [PERMISSIONS.SESSIONS_MANAGE])) {
    throw new ForbiddenError()
  }

  // Validate với Zod
  const validationResult = BulkSessionActionSchema.safeParse({ action: "hard-delete", ids })
  if (!validationResult.success) {
    const firstError = validationResult.error.issues[0]
    throw new ApplicationError(firstError?.message || "Dữ liệu không hợp lệ", 400)
  }

  if (!ids || ids.length === 0) {
    throw new ApplicationError("Danh sách session trống", 400)
  }

  // Lấy thông tin sessions trước khi delete để tạo notifications
  // Chỉ lấy các session có isActive=false
  const sessions = await prisma.session.findMany({
    where: {
      id: { in: ids },
      isActive: false,
    },
    select: { id: true, userId: true, accessToken: true },
  })

  if (sessions.length === 0) {
    throw new ApplicationError("Không có session nào đã bị xóa (isActive=false) để xóa vĩnh viễn", 400)
  }

  const result = await prisma.session.deleteMany({
    where: {
      id: { in: ids },
      isActive: false, // Chỉ hard delete khi isActive=false
    },
  })

  // Emit notifications realtime cho từng session
  for (const session of sessions) {
    await notifySuperAdminsOfSessionAction(
      "hard-delete",
      ctx.actorId,
      session
    )
  }

  return { success: true, message: `Đã xóa vĩnh viễn ${result.count} session`, affectedCount: result.count }
}

