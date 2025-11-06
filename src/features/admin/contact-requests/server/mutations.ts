import type { Prisma } from "@prisma/client"
import type { Permission } from "@/lib/permissions"
import { PERMISSIONS, canPerformAction, canPerformAnyAction } from "@/lib/permissions"
import { prisma } from "@/lib/database"
import { mapContactRequestRecord, type ContactRequestWithRelations } from "./helpers"
import type { ListedContactRequest } from "../types"
import type { BulkActionResult } from "../types"
import {
  CreateContactRequestSchema,
  UpdateContactRequestSchema,
  AssignContactRequestSchema,
  BulkContactRequestActionSchema,
  type CreateContactRequestInput,
  type UpdateContactRequestInput,
  type AssignContactRequestInput,
  type BulkContactRequestActionInput,
} from "./schemas"
import {
  notifySuperAdminsOfContactRequestAction,
  notifyUserOfContactRequestAssignment,
} from "./notifications"

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

function sanitizeContactRequest(contactRequest: ContactRequestWithRelations): ListedContactRequest {
  return mapContactRequestRecord(contactRequest)
}

export async function createContactRequest(ctx: AuthContext, input: unknown): Promise<ListedContactRequest> {
  ensurePermission(ctx, PERMISSIONS.CONTACT_REQUESTS_UPDATE, PERMISSIONS.CONTACT_REQUESTS_MANAGE)

  // Validate input với zod
  const validationResult = CreateContactRequestSchema.safeParse(input)
  if (!validationResult.success) {
    const firstError = validationResult.error.issues[0]
    throw new ApplicationError(firstError?.message || "Dữ liệu không hợp lệ", 400)
  }

  const validatedInput = validationResult.data

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

  return sanitized
}

export async function updateContactRequest(ctx: AuthContext, id: string, input: unknown): Promise<ListedContactRequest> {
  ensurePermission(ctx, PERMISSIONS.CONTACT_REQUESTS_UPDATE, PERMISSIONS.CONTACT_REQUESTS_MANAGE)

  if (!id || typeof id !== "string" || id.trim() === "") {
    throw new ApplicationError("ID yêu cầu liên hệ không hợp lệ", 400)
  }

  // Validate input với zod
  const validationResult = UpdateContactRequestSchema.safeParse(input)
  if (!validationResult.success) {
    const firstError = validationResult.error.issues[0]
    throw new ApplicationError(firstError?.message || "Dữ liệu không hợp lệ", 400)
  }

  const validatedInput = validationResult.data

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

  return sanitized
}

export async function assignContactRequest(ctx: AuthContext, id: string, input: unknown): Promise<ListedContactRequest> {
  ensurePermission(ctx, PERMISSIONS.CONTACT_REQUESTS_ASSIGN, PERMISSIONS.CONTACT_REQUESTS_MANAGE)

  if (!id || typeof id !== "string" || id.trim() === "") {
    throw new ApplicationError("ID yêu cầu liên hệ không hợp lệ", 400)
  }

  // Validate input với zod
  const validationResult = AssignContactRequestSchema.safeParse(input)
  if (!validationResult.success) {
    const firstError = validationResult.error.issues[0]
    throw new ApplicationError(firstError?.message || "Dữ liệu không hợp lệ", 400)
  }

  const validatedInput = validationResult.data
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

  return sanitized
}

export async function softDeleteContactRequest(ctx: AuthContext, id: string): Promise<void> {
  ensurePermission(ctx, PERMISSIONS.CONTACT_REQUESTS_MANAGE)

  const contactRequest = await prisma.contactRequest.findUnique({ where: { id } })
  if (!contactRequest || contactRequest.deletedAt) {
    throw new NotFoundError("Yêu cầu liên hệ không tồn tại")
  }

  await prisma.contactRequest.update({
    where: { id },
    data: {
      deletedAt: new Date(),
    },
  })

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

  // Emit notifications realtime cho từng contact request
  for (const contactRequest of contactRequests) {
    await notifySuperAdminsOfContactRequestAction(
      "delete",
      ctx.actorId,
      contactRequest
    )
  }

  return { success: true, message: `Đã xóa ${result.count} yêu cầu liên hệ`, affected: result.count }
}

export async function restoreContactRequest(ctx: AuthContext, id: string): Promise<void> {
  ensurePermission(ctx, PERMISSIONS.CONTACT_REQUESTS_UPDATE, PERMISSIONS.CONTACT_REQUESTS_MANAGE)

  const contactRequest = await prisma.contactRequest.findUnique({ where: { id } })
  if (!contactRequest || !contactRequest.deletedAt) {
    throw new NotFoundError("Yêu cầu liên hệ không tồn tại hoặc chưa bị xóa")
  }

  await prisma.contactRequest.update({
    where: { id },
    data: {
      deletedAt: null,
    },
  })

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

  // Emit notifications realtime cho từng contact request
  for (const contactRequest of contactRequests) {
    await notifySuperAdminsOfContactRequestAction(
      "restore",
      ctx.actorId,
      contactRequest
    )
  }

  return { success: true, message: `Đã khôi phục ${result.count} yêu cầu liên hệ`, affected: result.count }
}

export async function hardDeleteContactRequest(ctx: AuthContext, id: string): Promise<void> {
  if (!canPerformAnyAction(ctx.permissions, ctx.roles, [PERMISSIONS.CONTACT_REQUESTS_MANAGE])) {
    throw new ForbiddenError()
  }

  const contactRequest = await prisma.contactRequest.findUnique({
    where: { id },
    select: { id: true, subject: true, name: true, email: true },
  })

  if (!contactRequest) {
    throw new NotFoundError("Yêu cầu liên hệ không tồn tại")
  }

  await prisma.contactRequest.delete({
    where: { id },
  })

  // Emit notification realtime
  await notifySuperAdminsOfContactRequestAction(
    "hard-delete",
    ctx.actorId,
    contactRequest
  )
}

export async function bulkHardDeleteContactRequests(ctx: AuthContext, ids: string[]): Promise<BulkActionResult> {
  if (!canPerformAnyAction(ctx.permissions, ctx.roles, [PERMISSIONS.CONTACT_REQUESTS_MANAGE])) {
    throw new ForbiddenError()
  }

  if (!ids || ids.length === 0) {
    throw new ApplicationError("Danh sách yêu cầu liên hệ trống", 400)
  }

  // Lấy thông tin contact requests trước khi delete để tạo notifications
  const contactRequests = await prisma.contactRequest.findMany({
    where: {
      id: { in: ids },
    },
    select: { id: true, subject: true, name: true, email: true },
  })

  const result = await prisma.contactRequest.deleteMany({
    where: {
      id: { in: ids },
    },
  })

  // Emit notifications realtime cho từng contact request
  for (const contactRequest of contactRequests) {
    await notifySuperAdminsOfContactRequestAction(
      "hard-delete",
      ctx.actorId,
      contactRequest
    )
  }

  return { success: true, message: `Đã xóa vĩnh viễn ${result.count} yêu cầu liên hệ`, affected: result.count }
}

