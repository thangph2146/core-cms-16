"use server"

import type { Prisma } from "@prisma/client"
import { PERMISSIONS, canPerformAnyAction } from "@/lib/permissions"
import { prisma } from "@/lib/database"
import { logger } from "@/lib/config"
import { mapContactRequestRecord, type ContactRequestWithRelations } from "./helpers"
import type { ListedContactRequest } from "../types"
import type { BulkActionResult } from "../types"
import {
  CreateContactRequestSchema,
  UpdateContactRequestSchema,
  AssignContactRequestSchema,
  type CreateContactRequestInput,
  type UpdateContactRequestInput,
  type AssignContactRequestInput,
} from "./schemas"
import {
  notifySuperAdminsOfContactRequestAction,
  notifyUserOfContactRequestAssignment,
} from "./notifications"
import {
  ApplicationError,
  ForbiddenError,
  NotFoundError,
  ensurePermission,
  invalidateResourceCache,
  invalidateResourceCacheBulk,
  type AuthContext,
} from "@/features/admin/resources/server"
import { emitContactRequestUpsert, emitContactRequestRemove, emitContactRequestAssigned } from "./events"

// Re-export for backward compatibility with API routes
export { ApplicationError, ForbiddenError, NotFoundError, type AuthContext }

function sanitizeContactRequest(contactRequest: ContactRequestWithRelations): ListedContactRequest {
  return mapContactRequestRecord(contactRequest)
}

export async function createContactRequest(ctx: AuthContext, input: CreateContactRequestInput): Promise<ListedContactRequest> {
  ensurePermission(ctx, PERMISSIONS.CONTACT_REQUESTS_UPDATE, PERMISSIONS.CONTACT_REQUESTS_MANAGE)

  // Validate input với zod
  const validatedInput = CreateContactRequestSchema.parse(input)

  const contactRequest = await prisma.contactRequest.create({
    data: {
      name: validatedInput.name.trim(),
      email: validatedInput.email.trim(),
      phone: validatedInput.phone?.trim() || null,
      subject: validatedInput.subject.trim(),
      content: validatedInput.content.trim(),
      status: validatedInput.status || "NEW",
      priority: validatedInput.priority || "MEDIUM",
      userId: ctx.actorId !== "unknown" ? ctx.actorId : null,
    },
    include: {
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })

  const sanitized = sanitizeContactRequest(contactRequest)

  // Emit notification realtime
  await notifySuperAdminsOfContactRequestAction(
    "create",
    ctx.actorId,
    {
      id: sanitized.id,
      subject: sanitized.subject,
      name: sanitized.name,
      email: sanitized.email,
    }
  )

  // Invalidate cache
  await invalidateResourceCache({ resource: "contact-requests", id: sanitized.id })

  return sanitized
}

export async function updateContactRequest(ctx: AuthContext, id: string, input: UpdateContactRequestInput): Promise<ListedContactRequest> {
  ensurePermission(ctx, PERMISSIONS.CONTACT_REQUESTS_UPDATE, PERMISSIONS.CONTACT_REQUESTS_MANAGE)

  if (!id || typeof id !== "string" || id.trim() === "") {
    throw new ApplicationError("ID yêu cầu liên hệ không hợp lệ", 400)
  }

  // Validate input với zod
  const validatedInput = UpdateContactRequestSchema.parse(input)

  const existing = await prisma.contactRequest.findUnique({
    where: { id },
    include: {
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })

  if (!existing || existing.deletedAt) {
    throw new NotFoundError("Yêu cầu liên hệ không tồn tại")
  }

  // Track changes for notification
  const changes: {
    status?: { old: string; new: string }
    priority?: { old: string; new: string }
    assignedToId?: { old: string | null; new: string | null }
  } = {}

  const updateData: Prisma.ContactRequestUpdateInput = {}

  if (validatedInput.name !== undefined) {
    updateData.name = validatedInput.name.trim()
  }

  if (validatedInput.email !== undefined) {
    updateData.email = validatedInput.email.trim()
  }

  if (validatedInput.phone !== undefined) {
    updateData.phone = validatedInput.phone?.trim() || null
  }

  if (validatedInput.subject !== undefined) {
    updateData.subject = validatedInput.subject.trim()
  }

  if (validatedInput.content !== undefined) {
    updateData.content = validatedInput.content.trim()
  }

  if (validatedInput.status !== undefined) {
    changes.status = { old: existing.status, new: validatedInput.status }
    updateData.status = validatedInput.status
  }

  if (validatedInput.priority !== undefined) {
    changes.priority = { old: existing.priority, new: validatedInput.priority }
    updateData.priority = validatedInput.priority
  }

  if (validatedInput.assignedToId !== undefined) {
    changes.assignedToId = { old: existing.assignedToId, new: validatedInput.assignedToId }
    if (validatedInput.assignedToId) {
      // Verify user exists
      const user = await prisma.user.findUnique({
        where: { id: validatedInput.assignedToId },
      })
      if (!user) {
        throw new ApplicationError("Người dùng được giao không tồn tại", 400)
      }
      updateData.assignedTo = {
        connect: { id: validatedInput.assignedToId },
      }
    } else {
      updateData.assignedTo = {
        disconnect: true,
      }
    }
  }

  if (validatedInput.isRead !== undefined) {
    updateData.isRead = validatedInput.isRead
  }

  const contactRequest = await prisma.contactRequest.update({
    where: { id },
    data: updateData,
    include: {
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })

  const sanitized = sanitizeContactRequest(contactRequest)

  // Determine previous status for socket event
  const previousStatus: "active" | "deleted" | null = existing.deletedAt ? "deleted" : "active"

  // Emit socket event for real-time updates (especially for isRead changes)
  await emitContactRequestUpsert(sanitized.id, previousStatus)

  // Emit notification realtime
  await notifySuperAdminsOfContactRequestAction(
    "update",
    ctx.actorId,
    {
      id: sanitized.id,
      subject: sanitized.subject,
      name: sanitized.name,
      email: sanitized.email,
    },
    Object.keys(changes).length > 0 ? changes : undefined
  )

  // Invalidate cache - QUAN TRỌNG: phải invalidate detail page để cập nhật ngay
  await invalidateResourceCache({ resource: "contact-requests", id })

  return sanitized
}

export async function assignContactRequest(ctx: AuthContext, id: string, input: AssignContactRequestInput): Promise<ListedContactRequest> {
  ensurePermission(ctx, PERMISSIONS.CONTACT_REQUESTS_ASSIGN, PERMISSIONS.CONTACT_REQUESTS_MANAGE)

  if (!id || typeof id !== "string" || id.trim() === "") {
    throw new ApplicationError("ID yêu cầu liên hệ không hợp lệ", 400)
  }

  // Validate input với zod
  const validatedInput = AssignContactRequestSchema.parse(input)
  const assignedToId = validatedInput.assignedToId

  const existing = await prisma.contactRequest.findUnique({
    where: { id },
    include: {
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })

  if (!existing || existing.deletedAt) {
    throw new NotFoundError("Yêu cầu liên hệ không tồn tại")
  }

  if (assignedToId) {
    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: assignedToId },
    })
    if (!user) {
      throw new ApplicationError("Người dùng được giao không tồn tại", 400)
    }
  }

  const contactRequest = await prisma.contactRequest.update({
    where: { id },
    data: {
      assignedToId: assignedToId || null,
    },
    include: {
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })

  const sanitized = sanitizeContactRequest(contactRequest)

  // Emit socket event for assignment
  await emitContactRequestAssigned(
    sanitized.id,
    sanitized.assignedToId,
    sanitized.assignedTo?.name ?? null
  )

  // Get actor info for notification
  const actor = await prisma.user.findUnique({
    where: { id: ctx.actorId },
    select: { id: true, name: true, email: true },
  })

  // Emit notification realtime
  await notifySuperAdminsOfContactRequestAction(
    "assign",
    ctx.actorId,
    {
      id: sanitized.id,
      subject: sanitized.subject,
      name: sanitized.name,
      email: sanitized.email,
    },
    {
      assignedToId: {
        old: existing.assignedToId,
        new: assignedToId,
      },
    }
  )

  // Notify assigned user if assigned
  if (assignedToId && actor) {
    await notifyUserOfContactRequestAssignment(
      assignedToId,
      {
        id: sanitized.id,
        subject: sanitized.subject,
        name: sanitized.name,
        email: sanitized.email,
      },
      {
        id: actor.id,
        name: actor.name,
        email: actor.email,
      }
    )
  }

  // Invalidate cache - QUAN TRỌNG: phải invalidate detail page để cập nhật ngay
  await invalidateResourceCache({ resource: "contact-requests", id })

  return sanitized
}

export async function softDeleteContactRequest(ctx: AuthContext, id: string): Promise<void> {
  ensurePermission(ctx, PERMISSIONS.CONTACT_REQUESTS_MANAGE)

  const contactRequest = await prisma.contactRequest.findUnique({ where: { id } })
  if (!contactRequest || contactRequest.deletedAt) {
    throw new NotFoundError("Yêu cầu liên hệ không tồn tại")
  }

  const previousStatus: "active" | "deleted" = contactRequest.deletedAt ? "deleted" : "active"

  await prisma.contactRequest.update({
    where: { id },
    data: {
      deletedAt: new Date(),
    },
  })

  // Emit socket event for real-time updates
  await emitContactRequestUpsert(id, previousStatus)

  // Emit notification realtime
  await notifySuperAdminsOfContactRequestAction(
    "delete",
    ctx.actorId,
    {
      id: contactRequest.id,
      subject: contactRequest.subject,
      name: contactRequest.name,
      email: contactRequest.email,
    }
  )

  // Invalidate cache
  await invalidateResourceCache({ resource: "contact-requests", id })
}

export async function bulkSoftDeleteContactRequests(ctx: AuthContext, ids: string[]): Promise<BulkActionResult> {
  ensurePermission(ctx, PERMISSIONS.CONTACT_REQUESTS_MANAGE)

  if (!ids || ids.length === 0) {
    throw new ApplicationError("Danh sách yêu cầu liên hệ trống", 400)
  }

  // Lấy thông tin contact requests trước khi delete để tạo notifications
  const contactRequests = await prisma.contactRequest.findMany({
    where: {
      id: { in: ids },
      deletedAt: null,
    },
    select: { id: true, subject: true, name: true, email: true },
  })

  const result = await prisma.contactRequest.updateMany({
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
    const emitPromises = contactRequests.map((contactRequest) => 
      emitContactRequestUpsert(contactRequest.id, "active").catch((error) => {
        logger.error(`Failed to emit contact-request:upsert for ${contactRequest.id}`, error as Error)
        return null // Return null để Promise.allSettled không throw
      })
    )
    // Await tất cả events nhưng không fail nếu một số lỗi
    await Promise.allSettled(emitPromises)

    // Emit notifications realtime cho từng contact request
    for (const contactRequest of contactRequests) {
      await notifySuperAdminsOfContactRequestAction(
        "delete",
        ctx.actorId,
        contactRequest
      )
    }
  }

  // Invalidate cache cho bulk operation
  await invalidateResourceCacheBulk({ resource: "contact-requests" })

  return { success: true, message: `Đã xóa ${result.count} yêu cầu liên hệ`, affected: result.count }
}

export async function restoreContactRequest(ctx: AuthContext, id: string): Promise<void> {
  ensurePermission(ctx, PERMISSIONS.CONTACT_REQUESTS_UPDATE, PERMISSIONS.CONTACT_REQUESTS_MANAGE)

  const contactRequest = await prisma.contactRequest.findUnique({ where: { id } })
  if (!contactRequest || !contactRequest.deletedAt) {
    throw new NotFoundError("Yêu cầu liên hệ không tồn tại hoặc chưa bị xóa")
  }

  const previousStatus: "active" | "deleted" = contactRequest.deletedAt ? "deleted" : "active"

  await prisma.contactRequest.update({
    where: { id },
    data: {
      deletedAt: null,
    },
  })

  // Emit socket event for real-time updates
  await emitContactRequestUpsert(id, previousStatus)

  // Emit notification realtime
  await notifySuperAdminsOfContactRequestAction(
    "restore",
    ctx.actorId,
    {
      id: contactRequest.id,
      subject: contactRequest.subject,
      name: contactRequest.name,
      email: contactRequest.email,
    }
  )

  // Invalidate cache
  await invalidateResourceCache({ resource: "contact-requests", id })
}

export async function bulkRestoreContactRequests(ctx: AuthContext, ids: string[]): Promise<BulkActionResult> {
  ensurePermission(ctx, PERMISSIONS.CONTACT_REQUESTS_UPDATE, PERMISSIONS.CONTACT_REQUESTS_MANAGE)

  if (!ids || ids.length === 0) {
    throw new ApplicationError("Danh sách yêu cầu liên hệ trống", 400)
  }

  // Lấy thông tin contact requests trước khi restore để tạo notifications
  const contactRequests = await prisma.contactRequest.findMany({
    where: {
      id: { in: ids },
      deletedAt: { not: null },
    },
    select: { id: true, subject: true, name: true, email: true },
  })

  const result = await prisma.contactRequest.updateMany({
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
    const emitPromises = contactRequests.map((contactRequest) => 
      emitContactRequestUpsert(contactRequest.id, "deleted").catch((error) => {
        logger.error(`Failed to emit contact-request:upsert for ${contactRequest.id}`, error as Error)
        return null // Return null để Promise.allSettled không throw
      })
    )
    // Await tất cả events nhưng không fail nếu một số lỗi
    await Promise.allSettled(emitPromises)

    // Emit notifications realtime cho từng contact request
    for (const contactRequest of contactRequests) {
      await notifySuperAdminsOfContactRequestAction(
        "restore",
        ctx.actorId,
        contactRequest
      )
    }
  }

  // Invalidate cache cho bulk operation
  await invalidateResourceCacheBulk({ resource: "contact-requests" })

  return { success: true, message: `Đã khôi phục ${result.count} yêu cầu liên hệ`, affected: result.count }
}

export async function hardDeleteContactRequest(ctx: AuthContext, id: string): Promise<void> {
  if (!canPerformAnyAction(ctx.permissions, ctx.roles, [PERMISSIONS.CONTACT_REQUESTS_MANAGE])) {
    throw new ForbiddenError()
  }

  const contactRequest = await prisma.contactRequest.findUnique({
    where: { id },
    select: { id: true, subject: true, name: true, email: true, deletedAt: true },
  })

  if (!contactRequest) {
    throw new NotFoundError("Yêu cầu liên hệ không tồn tại")
  }

  const previousStatus: "active" | "deleted" = contactRequest.deletedAt ? "deleted" : "active"

  await prisma.contactRequest.delete({
    where: { id },
  })

  // Emit socket event for real-time updates
  emitContactRequestRemove(id, previousStatus)

  // Emit notification realtime
  await notifySuperAdminsOfContactRequestAction(
    "hard-delete",
    ctx.actorId,
    contactRequest
  )

  // Invalidate cache
  await invalidateResourceCache({ resource: "contact-requests", id })
}

export async function bulkHardDeleteContactRequests(ctx: AuthContext, ids: string[]): Promise<BulkActionResult> {
  if (!canPerformAnyAction(ctx.permissions, ctx.roles, [PERMISSIONS.CONTACT_REQUESTS_MANAGE])) {
    throw new ForbiddenError()
  }

  if (!ids || ids.length === 0) {
    throw new ApplicationError("Danh sách yêu cầu liên hệ trống", 400)
  }

  // Lấy thông tin contact requests trước khi delete để tạo notifications và emit socket events
  const contactRequests = await prisma.contactRequest.findMany({
    where: {
      id: { in: ids },
    },
    select: { id: true, subject: true, name: true, email: true, deletedAt: true },
  })

  const result = await prisma.contactRequest.deleteMany({
    where: {
      id: { in: ids },
    },
  })

  // Emit socket events để update UI - fire and forget để tránh timeout
  // Emit song song cho tất cả contact requests đã bị hard delete
  if (result.count > 0) {
    // Emit events (emitContactRequestRemove trả về void, không phải Promise)
    contactRequests.forEach((contactRequest) => {
      const previousStatus: "active" | "deleted" = contactRequest.deletedAt ? "deleted" : "active"
      try {
        emitContactRequestRemove(contactRequest.id, previousStatus)
      } catch (error) {
        logger.error(`Failed to emit contact-request:remove for ${contactRequest.id}`, error as Error)
      }
    })

    // Emit notifications realtime cho từng contact request
    for (const contactRequest of contactRequests) {
      await notifySuperAdminsOfContactRequestAction(
        "hard-delete",
        ctx.actorId,
        contactRequest
      )
    }
  }

  // Invalidate cache cho bulk operation
  await invalidateResourceCacheBulk({ resource: "contact-requests" })

  return { success: true, message: `Đã xóa vĩnh viễn ${result.count} yêu cầu liên hệ`, affected: result.count }
}

