"use server"

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
  type CreateSessionInput,
  type UpdateSessionInput,
} from "./schemas"
import { notifySuperAdminsOfSessionAction, notifySuperAdminsOfBulkSessionAction } from "./notifications"
import { emitSessionUpsert, emitSessionRemove, emitSessionBatchUpsert } from "./events"
import {
  ApplicationError,
  ForbiddenError,
  NotFoundError,
  ensurePermission,
  logActionFlow,
  logDetailAction,
  type AuthContext,
} from "@/features/admin/resources/server"

// Re-export for backward compatibility with API routes
export { ApplicationError, ForbiddenError, NotFoundError, type AuthContext }

function sanitizeSession(session: SessionWithRelations): ListedSession {
  return mapSessionRecord(session)
}

async function logSessionTableStatus(
  action: "delete" | "restore" | "bulk-delete" | "bulk-restore",
  affectedIds: string | string[],
  affectedCount?: number
): Promise<void> {
  logActionFlow("sessions", action, "start", { 
    loggingTableStatus: true, 
    affectedCount,
    affectedIds: Array.isArray(affectedIds) ? affectedIds.length : 1,
  })

  const [activeCount, deletedCount] = await Promise.all([
    prisma.session.count({ where: { isActive: true } }),
    prisma.session.count({ where: { isActive: false } }),
  ])

  const isBulk = action.startsWith("bulk-")
  const summary = isBulk
    ? (action === "bulk-delete" 
        ? `Đã xóa ${affectedCount} session. Hiện tại: ${activeCount} active, ${deletedCount} đã xóa`
        : `Đã khôi phục ${affectedCount} session. Hiện tại: ${activeCount} active, ${deletedCount} đã xóa`)
    : (action === "delete"
        ? `Đã xóa 1 session. Hiện tại: ${activeCount} active, ${deletedCount} đã xóa`
        : `Đã khôi phục 1 session. Hiện tại: ${activeCount} active, ${deletedCount} đã xóa`)

  logActionFlow("sessions", action, "success", {
    tableStatusLogged: true,
    activeCount,
    deletedCount,
    affectedCount,
    affectedIds: Array.isArray(affectedIds) ? affectedIds : [affectedIds],
    summary,
    dataStructure: {
      dataType: "table",
      currentActiveCount: activeCount,
      currentDeletedCount: deletedCount,
      affectedCount,
      affectedIds: Array.isArray(affectedIds) ? affectedIds : [affectedIds],
      summary,
    },
  })
}

export async function createSession(ctx: AuthContext, input: CreateSessionInput): Promise<ListedSession> {
  ensurePermission(ctx, PERMISSIONS.SESSIONS_CREATE, PERMISSIONS.SESSIONS_MANAGE)

  // Validate input với zod
  const validatedInput = CreateSessionSchema.parse(input)

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

  await emitSessionUpsert(sanitized.id, null)

  const startTime = Date.now()
  logActionFlow("sessions", "create", "success", { sessionId: sanitized.id, userId: sanitized.userId }, startTime)
  logDetailAction("sessions", "create", sanitized.id, sanitized as unknown as Record<string, unknown>)

  return sanitized
}

export async function updateSession(ctx: AuthContext, id: string, input: UpdateSessionInput): Promise<ListedSession> {
  ensurePermission(ctx, PERMISSIONS.SESSIONS_UPDATE, PERMISSIONS.SESSIONS_MANAGE)

  if (!id || typeof id !== "string" || id.trim() === "") {
    throw new ApplicationError("ID session không hợp lệ", 400)
  }

  // Validate input với zod
  const validatedInput = UpdateSessionSchema.parse(input)

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

  if (Object.keys(updateData).length === 0) {
    const startTime = Date.now()
    logActionFlow("sessions", "update", "success", { sessionId: id, message: "Không có thay đổi" }, startTime)
    return sanitized
  }

  const previousStatus: "active" | "deleted" = existing.isActive ? "active" : "deleted"
  await emitSessionUpsert(id, previousStatus)

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

  const startTime = Date.now()
  logActionFlow("sessions", "update", "success", { sessionId: id, userId: sanitized.userId, changes: Object.keys(changes) }, startTime)
  logDetailAction("sessions", "update", id, sanitized as unknown as Record<string, unknown>)

  return sanitized
}

export async function softDeleteSession(ctx: AuthContext, id: string): Promise<void> {
  ensurePermission(ctx, PERMISSIONS.SESSIONS_DELETE, PERMISSIONS.SESSIONS_MANAGE)

  const startTime = Date.now()
  logActionFlow("sessions", "delete", "init", { sessionId: id })

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

  await logSessionTableStatus("delete", id)
  await emitSessionUpsert(id, "active")
  await notifySuperAdminsOfSessionAction(
    "delete",
    ctx.actorId,
    {
      id: session.id,
      userId: session.userId,
      accessToken: session.accessToken,
    }
  )

  logActionFlow("sessions", "delete", "success", { sessionId: id, userId: session.userId }, startTime)
  logDetailAction("sessions", "delete", id, { id: session.id, userId: session.userId, accessToken: session.accessToken } as unknown as Record<string, unknown>)
}

export async function bulkSoftDeleteSessions(ctx: AuthContext, ids: string[]): Promise<BulkActionResult> {
  ensurePermission(ctx, PERMISSIONS.SESSIONS_DELETE, PERMISSIONS.SESSIONS_MANAGE)

  const startTime = Date.now()
  logActionFlow("sessions", "bulk-delete", "start", { count: ids.length, sessionIds: ids })

  if (!ids || ids.length === 0) {
    logActionFlow("sessions", "bulk-delete", "error", { error: "Danh sách session trống" }, startTime)
    throw new ApplicationError("Danh sách session trống", 400)
  }

  const sessions = await prisma.session.findMany({
    where: {
      id: { in: ids },
      isActive: true,
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

  const result = await prisma.session.updateMany({
    where: {
      id: { in: sessions.map((s) => s.id) },
      isActive: true,
    },
    data: {
      isActive: false,
    },
  })

  await logSessionTableStatus("bulk-delete", sessions.map((s) => s.id), result.count)

  if (result.count > 0) {
    try {
      await emitSessionBatchUpsert(sessions.map((s) => s.id), "active")
    } catch (error) {
      logActionFlow("sessions", "bulk-delete", "error", {
        error: error instanceof Error ? error.message : String(error),
        count: result.count,
      })
    }

    try {
      await notifySuperAdminsOfBulkSessionAction(
        "delete",
        ctx.actorId,
        sessions.map((s) => ({
          userName: s.user.name,
          userEmail: s.user.email,
        }))
      )
    } catch (error) {
      logActionFlow("sessions", "bulk-delete", "error", {
        error: error instanceof Error ? error.message : String(error),
        notificationError: true,
      })
    }

    logActionFlow("sessions", "bulk-delete", "success", { requestedCount: ids.length, affectedCount: result.count }, startTime)
  }

  return { success: true, message: `Đã xóa ${result.count} session`, affectedCount: result.count }
}

export async function restoreSession(ctx: AuthContext, id: string): Promise<void> {
  ensurePermission(ctx, PERMISSIONS.SESSIONS_UPDATE, PERMISSIONS.SESSIONS_MANAGE)

  const startTime = Date.now()
  logActionFlow("sessions", "restore", "init", { sessionId: id })

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

  await logSessionTableStatus("restore", id)
  await emitSessionUpsert(id, "deleted")
  await notifySuperAdminsOfSessionAction(
    "restore",
    ctx.actorId,
    {
      id: session.id,
      userId: session.userId,
      accessToken: session.accessToken,
    }
  )

  logActionFlow("sessions", "restore", "success", { sessionId: id, userId: session.userId }, startTime)
  logDetailAction("sessions", "restore", id, { id: session.id, userId: session.userId, accessToken: session.accessToken } as unknown as Record<string, unknown>)
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

  const result = await prisma.session.updateMany({
    where: {
      id: { in: sessions.map((s) => s.id) },
      isActive: false,
    },
    data: {
      isActive: true,
    },
  })

  await logSessionTableStatus("bulk-restore", sessions.map((s) => s.id), result.count)

  if (result.count > 0) {
    try {
      await emitSessionBatchUpsert(sessions.map((s) => s.id), "deleted")
    } catch (error) {
      logActionFlow("sessions", "bulk-restore", "error", {
        error: error instanceof Error ? error.message : String(error),
        count: result.count,
      })
    }

    try {
      await notifySuperAdminsOfBulkSessionAction(
        "restore",
        ctx.actorId,
        sessions.map((s) => ({
          userName: s.user.name,
          userEmail: s.user.email,
        }))
      )
    } catch (error) {
      logActionFlow("sessions", "bulk-restore", "error", {
        error: error instanceof Error ? error.message : String(error),
        notificationError: true,
      })
    }

    const startTime = Date.now()
    logActionFlow("sessions", "bulk-restore", "success", { requestedCount: ids.length, affectedCount: result.count }, startTime)
  }

  return { success: true, message: `Đã khôi phục ${result.count} session`, affectedCount: result.count }
}

export async function hardDeleteSession(ctx: AuthContext, id: string): Promise<void> {
  if (!canPerformAnyAction(ctx.permissions, ctx.roles, [PERMISSIONS.SESSIONS_MANAGE])) {
    throw new ForbiddenError()
  }

  const startTime = Date.now()
  logActionFlow("sessions", "hard-delete", "init", { sessionId: id })

  const session = await prisma.session.findUnique({
    where: { id },
    select: { id: true, userId: true, accessToken: true, isActive: true },
  })

  if (!session) {
    throw new NotFoundError("Session không tồn tại")
  }

  if (session.isActive) {
    throw new ApplicationError("Chỉ có thể xóa vĩnh viễn session đã bị xóa (isActive=false)", 400)
  }

  const previousStatus: "active" | "deleted" = session.isActive ? "active" : "deleted"

  await prisma.session.delete({ where: { id } })
  emitSessionRemove(id, previousStatus)
  await notifySuperAdminsOfSessionAction("hard-delete", ctx.actorId, session)

  logActionFlow("sessions", "hard-delete", "success", { sessionId: id, userId: session.userId }, startTime)
  logDetailAction("sessions", "hard-delete", id, session as unknown as Record<string, unknown>)
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

  // Lấy thông tin sessions để kiểm tra trạng thái và tạo notifications
  const allSessions = await prisma.session.findMany({
    where: {
      id: { in: ids },
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

  if (allSessions.length === 0) {
    throw new ApplicationError("Không tìm thấy session nào trong danh sách", 404)
  }

  // Với quyền SESSIONS_MANAGE, cho phép hard delete cả active và deleted sessions
  // Đây là quyền cao nhất, cho phép xóa vĩnh viễn bất kỳ session nào
  // Hard delete tất cả sessions trong danh sách (cả active và deleted)
  // Vì đã check quyền SESSIONS_MANAGE ở trên
  const result = await prisma.session.deleteMany({
    where: {
      id: { in: allSessions.map((s) => s.id) },
    },
  })

  // Emit socket events để update UI
  if (result.count > 0) {
    // Xác định previousStatus cho mỗi session
    const previousStatuses = allSessions.map(s => (s.isActive ? "active" : "deleted") as "active" | "deleted")
    
    // Emit events (emitSessionRemove trả về void, không phải Promise)
    const startTime = Date.now()
    logActionFlow("sessions", "bulk-hard-delete", "start", { count: ids.length, sessionIds: ids })

    allSessions.forEach((s, index) => {
      const previousStatus = previousStatuses[index] || "active"
      try {
        emitSessionRemove(s.id, previousStatus)
      } catch (error) {
        logActionFlow("sessions", "bulk-hard-delete", "error", { 
          sessionId: s.id,
          error: error instanceof Error ? error.message : "Unknown error",
        }, startTime)
      }
    })

    try {
      await notifySuperAdminsOfBulkSessionAction(
        "hard-delete",
        ctx.actorId,
        allSessions.map((s) => ({
          userName: s.user.name,
          userEmail: s.user.email,
        }))
      )
    } catch (error) {
      logActionFlow("sessions", "bulk-hard-delete", "error", {
        error: error instanceof Error ? error.message : String(error),
        notificationError: true,
      }, startTime)
    }

    logActionFlow("sessions", "bulk-hard-delete", "success", { requestedCount: ids.length, affectedCount: result.count }, startTime)
  }

  return { success: true, message: `Đã xóa vĩnh viễn ${result.count} session`, affectedCount: result.count }
}

