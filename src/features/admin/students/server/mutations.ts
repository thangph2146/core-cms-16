"use server"

import type { Prisma } from "@prisma/client"
import { PERMISSIONS, canPerformAnyAction, isSuperAdmin } from "@/lib/permissions"
import { prisma } from "@/lib/database"
import { mapStudentRecord } from "./helpers"
import type { ListedStudent } from "../types"
import {
  CreateStudentSchema,
  UpdateStudentSchema,
  BulkStudentActionSchema,
  type CreateStudentInput,
  type UpdateStudentInput,
} from "./schemas"
import { notifySuperAdminsOfStudentAction, notifySuperAdminsOfBulkStudentAction, formatStudentNames } from "./notifications"
import {
  ApplicationError,
  ForbiddenError,
  NotFoundError,
  ensurePermission,
  logTableStatusAfterMutation,
  logActionFlow,
  logDetailAction,
  type AuthContext,
} from "@/features/admin/resources/server"
import type { BulkActionResult } from "@/features/admin/resources/types"
import { emitStudentUpsert, emitStudentRemove, emitStudentBatchUpsert } from "./events"

// Re-export for backward compatibility with API routes
export { ApplicationError, ForbiddenError, NotFoundError, type AuthContext }
export type { BulkActionResult }

export async function createStudent(ctx: AuthContext, input: CreateStudentInput): Promise<ListedStudent> {
  const startTime = Date.now()
  logActionFlow("students", "create", "init", { actorId: ctx.actorId, input: { studentCode: input.studentCode, name: input.name } })

  ensurePermission(ctx, PERMISSIONS.STUDENTS_CREATE, PERMISSIONS.STUDENTS_MANAGE)

  const validatedInput = CreateStudentSchema.parse(input)
  const trimmedStudentCode = validatedInput.studentCode.trim()
  logActionFlow("students", "create", "start", { studentCode: trimmedStudentCode }, startTime)

  const existing = await prisma.student.findFirst({
    where: {
      studentCode: trimmedStudentCode,
      deletedAt: null,
    },
  })

  if (existing) {
    logActionFlow("students", "create", "error", { error: "Mã học sinh đã tồn tại", studentCode: trimmedStudentCode }, startTime)
    throw new ApplicationError("Mã học sinh đã tồn tại", 400)
  }

  const isSuperAdminUser = isSuperAdmin(ctx.roles)
  let finalUserId: string | null = validatedInput.userId || null

  if (!isSuperAdminUser) {
    finalUserId = ctx.actorId
  }

  if (!isSuperAdminUser && validatedInput.userId && validatedInput.userId !== ctx.actorId) {
    logActionFlow("students", "create", "error", { error: "Không có quyền liên kết học sinh với tài khoản khác" }, startTime)
    throw new ForbiddenError("Bạn không có quyền liên kết học sinh với tài khoản khác")
  }

  const student = await prisma.student.create({
    data: {
      studentCode: trimmedStudentCode,
      name: validatedInput.name?.trim() || null,
      email: validatedInput.email?.trim() || null,
      userId: finalUserId,
      isActive: validatedInput.isActive ?? true,
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

  const sanitized = mapStudentRecord(student)

  await emitStudentUpsert(sanitized.id, null)
  await notifySuperAdminsOfStudentAction(
    "create",
    ctx.actorId,
    {
      id: sanitized.id,
      studentCode: sanitized.studentCode,
      name: sanitized.name,
    }
  )

  logActionFlow("students", "create", "success", { studentId: sanitized.id, studentCode: sanitized.studentCode }, startTime)
  logDetailAction("students", "create", sanitized.id, sanitized as unknown as Record<string, unknown>)

  return sanitized
}

export async function updateStudent(ctx: AuthContext, id: string, input: UpdateStudentInput): Promise<ListedStudent> {
  const startTime = Date.now()
  logActionFlow("students", "update", "init", { studentId: id, actorId: ctx.actorId })

  ensurePermission(ctx, PERMISSIONS.STUDENTS_UPDATE, PERMISSIONS.STUDENTS_MANAGE)

  if (!id || typeof id !== "string" || id.trim() === "") {
    throw new ApplicationError("ID học sinh không hợp lệ", 400)
  }

  const validatedInput = UpdateStudentSchema.parse(input)
  logActionFlow("students", "update", "start", { studentId: id, changes: Object.keys(validatedInput) }, startTime)

  const existing = await prisma.student.findUnique({
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

  if (!existing || existing.deletedAt) {
    logActionFlow("students", "update", "error", { studentId: id, error: "Học sinh không tồn tại" }, startTime)
    throw new NotFoundError("Học sinh không tồn tại")
  }

  const isSuperAdminUser = isSuperAdmin(ctx.roles)
  if (!isSuperAdminUser && existing.userId !== ctx.actorId) {
    logActionFlow("students", "update", "error", { studentId: id, error: "Bạn chỉ có thể cập nhật học sinh của chính mình" }, startTime)
    throw new ForbiddenError("Bạn chỉ có thể cập nhật học sinh của chính mình")
  }

  if (!isSuperAdminUser && validatedInput.userId !== undefined && validatedInput.userId !== existing.userId) {
    logActionFlow("students", "update", "error", { studentId: id, error: "Bạn không có quyền thay đổi liên kết tài khoản" }, startTime)
    throw new ForbiddenError("Bạn không có quyền thay đổi liên kết tài khoản")
  }

  const changes: {
    studentCode?: { old: string; new: string }
    name?: { old: string | null; new: string | null }
    email?: { old: string | null; new: string | null }
    isActive?: { old: boolean; new: boolean }
  } = {}

  const updateData: Prisma.StudentUpdateInput = {}

  if (validatedInput.studentCode !== undefined) {
    const trimmedStudentCode = validatedInput.studentCode.trim()
    if (trimmedStudentCode !== existing.studentCode) {
      const codeExists = await prisma.student.findFirst({
        where: {
          studentCode: trimmedStudentCode,
          deletedAt: null,
          id: { not: id },
        },
      })
      if (codeExists) {
        logActionFlow("students", "update", "error", { studentId: id, error: "Mã học sinh đã được sử dụng", newCode: trimmedStudentCode }, startTime)
        throw new ApplicationError("Mã học sinh đã được sử dụng", 400)
      }
      updateData.studentCode = trimmedStudentCode
      changes.studentCode = { old: existing.studentCode, new: trimmedStudentCode }
    }
  }

  if (validatedInput.name !== undefined) {
    const trimmedName = validatedInput.name?.trim() || null
    if (trimmedName !== existing.name) {
      updateData.name = trimmedName
      changes.name = { old: existing.name, new: trimmedName }
    }
  }

  if (validatedInput.email !== undefined) {
    const trimmedEmail = validatedInput.email?.trim() || null
    if (trimmedEmail !== existing.email) {
      updateData.email = trimmedEmail
      changes.email = { old: existing.email, new: trimmedEmail }
    }
  }

  if (validatedInput.userId !== undefined) {
    if (validatedInput.userId) {
      updateData.user = { connect: { id: validatedInput.userId } }
    } else {
      updateData.user = { disconnect: true }
    }
  }

  if (validatedInput.isActive !== undefined) {
    if (validatedInput.isActive !== existing.isActive) {
      updateData.isActive = validatedInput.isActive
      changes.isActive = { old: existing.isActive, new: validatedInput.isActive }
    }
  }

  if (Object.keys(updateData).length === 0) {
    logActionFlow("students", "update", "success", { studentId: id, studentCode: existing.studentCode, message: "Không có thay đổi nào được thực hiện" }, startTime)
    return mapStudentRecord(existing)
  }

  const student = await prisma.student.update({
    where: { id },
    data: {
      ...updateData,
      updatedAt: new Date(),
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

  const sanitized = mapStudentRecord(student)
  const previousStatus: "active" | "deleted" = existing.deletedAt ? "deleted" : "active"

  await emitStudentUpsert(sanitized.id, previousStatus)
  await notifySuperAdminsOfStudentAction(
    "update",
    ctx.actorId,
    {
      id: sanitized.id,
      studentCode: sanitized.studentCode,
      name: sanitized.name,
    },
    Object.keys(changes).length > 0 ? changes : undefined
  )

  logActionFlow("students", "update", "success", { studentId: sanitized.id, studentCode: sanitized.studentCode, changes: Object.keys(changes) }, startTime)
  logDetailAction("students", "update", sanitized.id, { ...sanitized, changes } as unknown as Record<string, unknown>)

  return sanitized
}

export async function softDeleteStudent(ctx: AuthContext, id: string): Promise<void> {
  const startTime = Date.now()
  logActionFlow("students", "delete", "init", { studentId: id, actorId: ctx.actorId })

  ensurePermission(ctx, PERMISSIONS.STUDENTS_DELETE, PERMISSIONS.STUDENTS_MANAGE)

  const student = await prisma.student.findUnique({ where: { id } })
  if (!student || student.deletedAt) {
    logActionFlow("students", "delete", "error", { studentId: id, error: "Học sinh không tồn tại" }, startTime)
    throw new NotFoundError("Học sinh không tồn tại")
  }

  const isSuperAdminUser = isSuperAdmin(ctx.roles)
  if (!isSuperAdminUser && student.userId !== ctx.actorId) {
    logActionFlow("students", "delete", "error", { studentId: id, error: "Bạn chỉ có thể xóa học sinh của chính mình" }, startTime)
    throw new ForbiddenError("Bạn chỉ có thể xóa học sinh của chính mình")
  }

  const previousStatus: "active" | "deleted" = student.deletedAt ? "deleted" : "active"

  await prisma.student.update({
    where: { id },
    data: {
      deletedAt: new Date(),
    },
  })

  await logTableStatusAfterMutation({
    resource: "students",
    action: "delete",
    prismaModel: prisma.student,
    affectedIds: id,
  })

  await emitStudentUpsert(id, previousStatus)
  await notifySuperAdminsOfStudentAction(
    "delete",
    ctx.actorId,
    {
      id: student.id,
      studentCode: student.studentCode,
      name: student.name,
    }
  )

  logActionFlow("students", "delete", "success", { studentId: id, studentCode: student.studentCode }, startTime)
  logDetailAction("students", "delete", id, { id: student.id, studentCode: student.studentCode, name: student.name } as unknown as Record<string, unknown>)
}

export async function bulkSoftDeleteStudents(ctx: AuthContext, ids: string[]): Promise<BulkActionResult> {
  const startTime = Date.now()
  logActionFlow("students", "bulk-delete", "start", { count: ids.length, studentIds: ids, actorId: ctx.actorId })

  ensurePermission(ctx, PERMISSIONS.STUDENTS_DELETE, PERMISSIONS.STUDENTS_MANAGE)

  if (!ids || ids.length === 0) {
    logActionFlow("students", "bulk-delete", "error", { error: "Danh sách học sinh trống" }, startTime)
    throw new ApplicationError("Danh sách học sinh trống", 400)
  }

  const students = await prisma.student.findMany({
    where: {
      id: { in: ids },
      deletedAt: null,
    },
    select: { id: true, studentCode: true, name: true },
  })

  const foundIds = students.map(s => s.id)
  const _notFoundIds = ids.filter(id => !foundIds.includes(id))

  if (students.length === 0) {
    const allStudents = await prisma.student.findMany({
      where: { id: { in: ids } },
      select: { id: true, studentCode: true, name: true, deletedAt: true },
    })
    const alreadyDeletedStudents = allStudents.filter(s => s.deletedAt !== null && s.deletedAt !== undefined)
    const alreadyDeletedCount = alreadyDeletedStudents.length
    const notFoundCount = ids.length - allStudents.length

    logActionFlow("students", "bulk-delete", "error", {
      requestedCount: ids.length,
      foundCount: students.length,
      alreadyDeletedCount,
      notFoundCount,
      error: "Không có học sinh nào có thể xóa",
    }, startTime)

    let errorMessage = "Không có học sinh nào có thể xóa"
    const parts: string[] = []
    if (alreadyDeletedCount > 0) {
      const studentNames = alreadyDeletedStudents.slice(0, 3).map(s => `"${s.name || s.studentCode}"`).join(", ")
      const moreCount = alreadyDeletedCount > 3 ? ` và ${alreadyDeletedCount - 3} học sinh khác` : ""
      parts.push(`${alreadyDeletedCount} học sinh đã bị xóa trước đó: ${studentNames}${moreCount}`)
    }
    if (notFoundCount > 0) {
      parts.push(`${notFoundCount} học sinh không tồn tại`)
    }

    if (parts.length > 0) {
      errorMessage += ` (${parts.join(", ")})`
    }

    throw new ApplicationError(errorMessage, 400)
  }

  const result = await prisma.student.updateMany({
    where: {
      id: { in: students.map((s) => s.id) },
      deletedAt: null,
    },
    data: {
      deletedAt: new Date(),
    },
  })

  // Log table status sau khi commit data
  await logTableStatusAfterMutation({
    resource: "students",
    action: "bulk-delete",
    prismaModel: prisma.student,
    affectedIds: students.map((s) => s.id),
    affectedCount: result.count,
  })

  if (result.count > 0 && students.length > 0) {
    try {
      await emitStudentBatchUpsert(students.map((s) => s.id), "active")
    } catch (error) {
      logActionFlow("students", "bulk-delete", "error", {
        error: error instanceof Error ? error.message : String(error),
        count: result.count,
      })
    }

    try {
      await notifySuperAdminsOfBulkStudentAction("delete", ctx.actorId, students)
    } catch (error) {
      logActionFlow("students", "bulk-delete", "error", {
        error: error instanceof Error ? error.message : String(error),
        notificationError: true,
      })
    }

    logActionFlow("students", "bulk-delete", "success", { requestedCount: ids.length, affectedCount: result.count }, startTime)
  }

  // Format message với tên học sinh
  const namesText = students.length > 0 ? formatStudentNames(students, 3) : ""
  const message = namesText
    ? `Đã xóa ${result.count} học sinh: ${namesText}`
    : `Đã xóa ${result.count} học sinh`
  
  return { success: true, message, affected: result.count }
}

export async function restoreStudent(ctx: AuthContext, id: string): Promise<void> {
  const startTime = Date.now()
  logActionFlow("students", "restore", "init", { studentId: id, actorId: ctx.actorId })

  ensurePermission(ctx, PERMISSIONS.STUDENTS_UPDATE, PERMISSIONS.STUDENTS_MANAGE)

  const student = await prisma.student.findUnique({ where: { id } })
  if (!student || !student.deletedAt) {
    logActionFlow("students", "restore", "error", { studentId: id, error: "Học sinh không tồn tại hoặc chưa bị xóa" }, startTime)
    throw new NotFoundError("Học sinh không tồn tại hoặc chưa bị xóa")
  }

  await prisma.student.update({
    where: { id },
    data: {
      deletedAt: null,
    },
  })

  await logTableStatusAfterMutation({
    resource: "students",
    action: "restore",
    prismaModel: prisma.student,
    affectedIds: id,
  })

  const previousStatus: "active" | "deleted" = student.deletedAt ? "deleted" : "active"
  await emitStudentUpsert(id, previousStatus)
  await notifySuperAdminsOfStudentAction(
    "restore",
    ctx.actorId,
    {
      id: student.id,
      studentCode: student.studentCode,
      name: student.name,
    }
  )

  logActionFlow("students", "restore", "success", { studentId: id, studentCode: student.studentCode }, startTime)
  logDetailAction("students", "restore", id, { id: student.id, studentCode: student.studentCode, name: student.name } as unknown as Record<string, unknown>)
}

export async function bulkRestoreStudents(ctx: AuthContext, ids: string[]): Promise<BulkActionResult> {
  const startTime = Date.now()
  logActionFlow("students", "bulk-restore", "start", { count: ids.length, studentIds: ids, actorId: ctx.actorId })

  ensurePermission(ctx, PERMISSIONS.STUDENTS_UPDATE, PERMISSIONS.STUDENTS_MANAGE)

  if (!ids || ids.length === 0) {
    logActionFlow("students", "bulk-restore", "error", { error: "Danh sách học sinh trống" }, startTime)
    throw new ApplicationError("Danh sách học sinh trống", 400)
  }

  const allRequestedStudents = await prisma.student.findMany({
    where: {
      id: { in: ids },
    },
    select: { id: true, deletedAt: true, studentCode: true, name: true },
  })

  const softDeletedStudents = allRequestedStudents.filter((student) => {
    const isDeleted = student.deletedAt !== null && student.deletedAt !== undefined
    return isDeleted
  })
  const activeStudents = allRequestedStudents.filter((student) => {
    const isActive = student.deletedAt === null || student.deletedAt === undefined
    return isActive
  })
  const notFoundCount = ids.length - allRequestedStudents.length

  if (softDeletedStudents.length === 0) {
    const parts: string[] = []
    if (activeStudents.length > 0) {
      parts.push(`${activeStudents.length} học sinh đang hoạt động`)
    }
    if (notFoundCount > 0) {
      parts.push(`${notFoundCount} học sinh không tồn tại (đã bị xóa vĩnh viễn)`)
    }

    const errorMessage = parts.length > 0
      ? `Không có học sinh nào để khôi phục (${parts.join(", ")})`
      : `Không tìm thấy học sinh nào để khôi phục`

    logActionFlow("students", "bulk-restore", "error", {
      requestedCount: ids.length,
      foundCount: allRequestedStudents.length,
      softDeletedCount: softDeletedStudents.length,
      activeCount: activeStudents.length,
      notFoundCount,
      error: errorMessage,
    }, startTime)

    throw new ApplicationError(errorMessage, 400)
  }

  const studentsToRestore = softDeletedStudents
  const result = await prisma.student.updateMany({
    where: {
      id: { in: softDeletedStudents.map((s) => s.id) },
      deletedAt: { not: null },
    },
    data: {
      deletedAt: null,
    },
  })

  // Log table status sau khi commit data
  await logTableStatusAfterMutation({
    resource: "students",
    action: "bulk-restore",
    prismaModel: prisma.student,
    affectedIds: studentsToRestore.map((s) => s.id),
    affectedCount: result.count,
  })

  if (result.count > 0 && studentsToRestore.length > 0) {
    try {
      await emitStudentBatchUpsert(studentsToRestore.map((s) => s.id), "deleted")
    } catch (error) {
      logActionFlow("students", "bulk-restore", "error", {
        error: error instanceof Error ? error.message : String(error),
        count: result.count,
      })
    }

    try {
      await notifySuperAdminsOfBulkStudentAction("restore", ctx.actorId, studentsToRestore)
    } catch (error) {
      logActionFlow("students", "bulk-restore", "error", {
        error: error instanceof Error ? error.message : String(error),
        notificationError: true,
      })
    }

    logActionFlow("students", "bulk-restore", "success", { requestedCount: ids.length, affectedCount: result.count }, startTime)
  }

  // Format message với tên học sinh
  const namesText = studentsToRestore.length > 0 ? formatStudentNames(studentsToRestore, 3) : ""
  let message = namesText
    ? `Đã khôi phục ${result.count} học sinh: ${namesText}`
    : `Đã khôi phục ${result.count} học sinh`
  const skippedCount = ids.length - result.count
  const skippedParts: string[] = []
  if (activeStudents.length > 0) {
    skippedParts.push(`${activeStudents.length} học sinh đang hoạt động`)
  }
  if (notFoundCount > 0) {
    skippedParts.push(`${notFoundCount} học sinh đã bị xóa vĩnh viễn`)
  }
  if (skippedParts.length > 0) {
    message += ` (${skippedCount} học sinh không thể khôi phục: ${skippedParts.join(", ")})`
  }

  return { success: true, message, affected: result.count }
}

export async function hardDeleteStudent(ctx: AuthContext, id: string): Promise<void> {
  const startTime = Date.now()
  logActionFlow("students", "hard-delete", "init", { studentId: id, actorId: ctx.actorId })

  if (!canPerformAnyAction(ctx.permissions, ctx.roles, [PERMISSIONS.STUDENTS_MANAGE])) {
    throw new ForbiddenError()
  }

  const student = await prisma.student.findUnique({
    where: { id },
    select: { id: true, studentCode: true, name: true, deletedAt: true },
  })

  if (!student) {
    logActionFlow("students", "hard-delete", "error", { studentId: id, error: "Học sinh không tồn tại" }, startTime)
    throw new NotFoundError("Học sinh không tồn tại")
  }

  const previousStatus: "active" | "deleted" = student.deletedAt ? "deleted" : "active"

  await prisma.student.delete({ where: { id } })
  emitStudentRemove(id, previousStatus)
  await notifySuperAdminsOfStudentAction("hard-delete", ctx.actorId, student)

  logActionFlow("students", "hard-delete", "success", { studentId: id, studentCode: student.studentCode }, startTime)
  logDetailAction("students", "hard-delete", id, student as unknown as Record<string, unknown>)
}

export async function bulkHardDeleteStudents(ctx: AuthContext, ids: string[]): Promise<BulkActionResult> {
  const startTime = Date.now()
  logActionFlow("students", "bulk-hard-delete", "start", { count: ids.length, studentIds: ids, actorId: ctx.actorId })

  if (!canPerformAnyAction(ctx.permissions, ctx.roles, [PERMISSIONS.STUDENTS_MANAGE])) {
    throw new ForbiddenError()
  }

  const validationResult = BulkStudentActionSchema.safeParse({ action: "hard-delete", ids })
  if (!validationResult.success) {
    const firstError = validationResult.error.issues[0]
    throw new ApplicationError(firstError?.message || "Dữ liệu không hợp lệ", 400)
  }

  if (!ids || ids.length === 0) {
    throw new ApplicationError("Danh sách học sinh trống", 400)
  }

  const students = await prisma.student.findMany({
    where: {
      id: { in: ids },
    },
    select: { id: true, studentCode: true, name: true, deletedAt: true },
  })

  const foundIds = students.map(s => s.id)
  const notFoundIds = ids.filter(id => !foundIds.includes(id))

  logActionFlow("students", "bulk-hard-delete", "start", {
    requestedCount: ids.length,
    foundCount: students.length,
    notFoundCount: notFoundIds.length,
    requestedIds: ids,
    foundIds,
    notFoundIds,
  })

  if (students.length === 0) {
    const errorMessage = `Không tìm thấy học sinh nào để xóa vĩnh viễn`
    logActionFlow("students", "bulk-hard-delete", "error", {
      requestedCount: ids.length,
      foundCount: students.length,
      notFoundCount: notFoundIds.length,
      error: errorMessage,
    }, startTime)
    throw new ApplicationError(errorMessage, 400)
  }

  const result = await prisma.student.deleteMany({
    where: {
      id: { in: students.map((s) => s.id) },
    },
  })

  if (result.count > 0 && students.length > 0) {
    students.forEach((student) => {
      const previousStatus: "active" | "deleted" = student.deletedAt ? "deleted" : "active"
      try {
        emitStudentRemove(student.id, previousStatus)
      } catch (error) {
        logActionFlow("students", "bulk-hard-delete", "error", {
          studentId: student.id,
          error: error instanceof Error ? error.message : String(error),
        }, startTime)
      }
    })

    try {
      await notifySuperAdminsOfBulkStudentAction("hard-delete", ctx.actorId, students)
    } catch (error) {
      logActionFlow("students", "bulk-hard-delete", "error", {
        error: error instanceof Error ? error.message : String(error),
        notificationError: true,
      }, startTime)
    }

    logActionFlow("students", "bulk-hard-delete", "success", { requestedCount: ids.length, affectedCount: result.count }, startTime)
  }

  // Format message với tên học sinh
  const namesText = students.length > 0 ? formatStudentNames(students, 3) : ""
  const message = namesText
    ? `Đã xóa vĩnh viễn ${result.count} học sinh: ${namesText}`
    : `Đã xóa vĩnh viễn ${result.count} học sinh`
  
  return { success: true, message, affected: result.count }
}

