"use server"

import type { Prisma } from "@prisma/client"
import { PERMISSIONS, canPerformAnyAction, isSuperAdmin } from "@/lib/permissions"
import { prisma } from "@/lib/database"
import { resourceLogger } from "@/lib/config"
import { mapStudentRecord, type StudentWithRelations } from "./helpers"
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
  invalidateResourceCache,
  invalidateResourceCacheBulk,
  type AuthContext,
} from "@/features/admin/resources/server"
import type { BulkActionResult } from "@/features/admin/resources/types"
import { emitStudentUpsert, emitStudentRemove, emitStudentBatchUpsert } from "./events"

// Re-export for backward compatibility with API routes
export { ApplicationError, ForbiddenError, NotFoundError, type AuthContext }
export type { BulkActionResult }

export async function createStudent(ctx: AuthContext, input: CreateStudentInput): Promise<ListedStudent> {
  const startTime = Date.now()

  resourceLogger.actionFlow({
    resource: "students",
    action: "create",
    step: "start",
    metadata: { actorId: ctx.actorId, input: { studentCode: input.studentCode, name: input.name } },
  })

  ensurePermission(ctx, PERMISSIONS.STUDENTS_CREATE, PERMISSIONS.STUDENTS_MANAGE)

  const validatedInput = CreateStudentSchema.parse(input)
  const trimmedStudentCode = validatedInput.studentCode.trim()

  const existing = await prisma.student.findFirst({
    where: {
      studentCode: trimmedStudentCode,
      deletedAt: null,
    },
  })

  if (existing) {
    resourceLogger.actionFlow({
      resource: "students",
      action: "create",
      step: "error",
      metadata: { error: "Mã học sinh đã tồn tại", studentCode: trimmedStudentCode },
    })
    throw new ApplicationError("Mã học sinh đã tồn tại", 400)
  }

  const isSuperAdminUser = isSuperAdmin(ctx.roles)
  let finalUserId: string | null = validatedInput.userId || null

  if (!isSuperAdminUser) {
    finalUserId = ctx.actorId
  }

  if (!isSuperAdminUser && validatedInput.userId && validatedInput.userId !== ctx.actorId) {
    resourceLogger.actionFlow({
      resource: "students",
      action: "create",
      step: "error",
      metadata: { error: "Không có quyền liên kết học sinh với tài khoản khác" },
    })
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

  resourceLogger.cache({
    resource: "students",
    action: "cache-invalidate",
    operation: "invalidate",
    resourceId: sanitized.id,
    tags: ["students", `student-${sanitized.id}`, "active-students", "deleted-students"],
  })
  await invalidateResourceCache({
    resource: "students",
    id: sanitized.id,
    additionalTags: ["active-students", "deleted-students"],
  })

  resourceLogger.socket({
    resource: "students",
    action: "create",
    event: "student:upsert",
    resourceId: sanitized.id,
    payload: { studentId: sanitized.id, status: "active" },
  })
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

  resourceLogger.actionFlow({
    resource: "students",
    action: "create",
    step: "success",
    duration: Date.now() - startTime,
    metadata: { studentId: sanitized.id, studentCode: sanitized.studentCode },
  })

  resourceLogger.detailAction({
    resource: "students",
    action: "create",
    resourceId: sanitized.id,
    studentCode: sanitized.studentCode,
    studentName: sanitized.name,
  })

  return sanitized
}

export async function updateStudent(ctx: AuthContext, id: string, input: UpdateStudentInput): Promise<ListedStudent> {
  const startTime = Date.now()

  resourceLogger.actionFlow({
    resource: "students",
    action: "update",
    step: "start",
    metadata: { studentId: id, actorId: ctx.actorId, input },
  })

  ensurePermission(ctx, PERMISSIONS.STUDENTS_UPDATE, PERMISSIONS.STUDENTS_MANAGE)

  if (!id || typeof id !== "string" || id.trim() === "") {
    throw new ApplicationError("ID học sinh không hợp lệ", 400)
  }

  const validatedInput = UpdateStudentSchema.parse(input)

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
    resourceLogger.actionFlow({
      resource: "students",
      action: "update",
      step: "error",
      metadata: { studentId: id, error: "Học sinh không tồn tại" },
    })
    throw new NotFoundError("Học sinh không tồn tại")
  }

  const isSuperAdminUser = isSuperAdmin(ctx.roles)
  if (!isSuperAdminUser && existing.userId !== ctx.actorId) {
    resourceLogger.actionFlow({
      resource: "students",
      action: "update",
      step: "error",
      metadata: { studentId: id, error: "Bạn chỉ có thể cập nhật học sinh của chính mình" },
    })
    throw new ForbiddenError("Bạn chỉ có thể cập nhật học sinh của chính mình")
  }

  if (!isSuperAdminUser && validatedInput.userId !== undefined && validatedInput.userId !== existing.userId) {
    resourceLogger.actionFlow({
      resource: "students",
      action: "update",
      step: "error",
      metadata: { studentId: id, error: "Bạn không có quyền thay đổi liên kết tài khoản" },
    })
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
        resourceLogger.actionFlow({
          resource: "students",
          action: "update",
          step: "error",
          metadata: { studentId: id, error: "Mã học sinh đã được sử dụng", newCode: trimmedStudentCode },
        })
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
    resourceLogger.actionFlow({
      resource: "students",
      action: "update",
      step: "success",
      duration: Date.now() - startTime,
      metadata: { studentId: id, studentCode: existing.studentCode, message: "Không có thay đổi nào được thực hiện" },
    })
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

  resourceLogger.cache({
    resource: "students",
    action: "cache-invalidate",
    operation: "invalidate",
    resourceId: sanitized.id,
    tags: ["students", `student-${sanitized.id}`, "active-students", "deleted-students"],
  })
  await invalidateResourceCache({
    resource: "students",
    id: sanitized.id,
    additionalTags: ["active-students", "deleted-students"],
  })

  resourceLogger.socket({
    resource: "students",
    action: "update",
    event: "student:upsert",
    resourceId: sanitized.id,
    payload: { studentId: sanitized.id, previousStatus, newStatus: sanitized.deletedAt ? "deleted" : "active" },
  })
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

  resourceLogger.actionFlow({
    resource: "students",
    action: "update",
    step: "success",
    duration: Date.now() - startTime,
    metadata: { studentId: sanitized.id, studentCode: sanitized.studentCode, changes },
  })

  resourceLogger.detailAction({
    resource: "students",
    action: "update",
    resourceId: sanitized.id,
    studentCode: sanitized.studentCode,
    studentName: sanitized.name,
    changes,
  })

  return sanitized
}

export async function softDeleteStudent(ctx: AuthContext, id: string): Promise<void> {
  const startTime = Date.now()

  resourceLogger.actionFlow({
    resource: "students",
    action: "delete",
    step: "start",
    metadata: { studentId: id, actorId: ctx.actorId },
  })

  ensurePermission(ctx, PERMISSIONS.STUDENTS_DELETE, PERMISSIONS.STUDENTS_MANAGE)

  const student = await prisma.student.findUnique({ where: { id } })
  if (!student || student.deletedAt) {
    resourceLogger.actionFlow({
      resource: "students",
      action: "delete",
      step: "error",
      metadata: { studentId: id, error: "Học sinh không tồn tại" },
    })
    throw new NotFoundError("Học sinh không tồn tại")
  }

  const isSuperAdminUser = isSuperAdmin(ctx.roles)
  if (!isSuperAdminUser && student.userId !== ctx.actorId) {
    resourceLogger.actionFlow({
      resource: "students",
      action: "delete",
      step: "error",
      metadata: { studentId: id, error: "Bạn chỉ có thể xóa học sinh của chính mình" },
    })
    throw new ForbiddenError("Bạn chỉ có thể xóa học sinh của chính mình")
  }

  const previousStatus: "active" | "deleted" = student.deletedAt ? "deleted" : "active"

  await prisma.student.update({
    where: { id },
    data: {
      deletedAt: new Date(),
    },
  })

  resourceLogger.cache({
    resource: "students",
    action: "cache-invalidate",
    operation: "invalidate",
    resourceId: id,
    tags: ["students", `student-${id}`, "active-students", "deleted-students"],
  })
  await invalidateResourceCache({
    resource: "students",
    id,
    additionalTags: ["active-students", "deleted-students"],
  })

  resourceLogger.socket({
    resource: "students",
    action: "delete",
    event: "student:upsert",
    resourceId: id,
    payload: { studentId: id, previousStatus, newStatus: "deleted" },
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

  resourceLogger.actionFlow({
    resource: "students",
    action: "delete",
    step: "success",
    duration: Date.now() - startTime,
    metadata: { studentId: id, studentCode: student.studentCode, studentName: student.name },
  })
}

export async function bulkSoftDeleteStudents(ctx: AuthContext, ids: string[]): Promise<BulkActionResult> {
  const startTime = Date.now()

  resourceLogger.actionFlow({
    resource: "students",
    action: "bulk-delete",
    step: "start",
    metadata: { count: ids.length, studentIds: ids, actorId: ctx.actorId },
  })

  ensurePermission(ctx, PERMISSIONS.STUDENTS_DELETE, PERMISSIONS.STUDENTS_MANAGE)

  if (!ids || ids.length === 0) {
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
  const notFoundIds = ids.filter(id => !foundIds.includes(id))

  if (students.length === 0) {
    const allStudents = await prisma.student.findMany({
      where: { id: { in: ids } },
      select: { id: true, studentCode: true, name: true, deletedAt: true },
    })
    const alreadyDeletedStudents = allStudents.filter(s => s.deletedAt !== null && s.deletedAt !== undefined)
    const alreadyDeletedCount = alreadyDeletedStudents.length
    const notFoundCount = ids.length - allStudents.length

    resourceLogger.actionFlow({
      resource: "students",
      action: "bulk-delete",
      step: "error",
      metadata: {
        requestedCount: ids.length,
        foundCount: students.length,
        alreadyDeletedCount,
        notFoundCount,
        error: "Không có học sinh nào có thể xóa",
      },
    })

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

  resourceLogger.cache({
    resource: "students",
    action: "cache-invalidate",
    operation: "invalidate",
    tags: ["students", "active-students", "deleted-students"],
  })
  await invalidateResourceCacheBulk({
    resource: "students",
    additionalTags: ["active-students", "deleted-students"],
  })

  if (result.count > 0 && students.length > 0) {
    resourceLogger.socket({
      resource: "students",
      action: "bulk-delete",
      event: "student:batch-upsert",
      payload: {
        studentIds: students.map((s) => s.id),
        previousStatus: "active",
        count: students.length,
      },
    })
    await emitStudentBatchUpsert(
      students.map((s) => s.id),
      "active"
    ).catch((error) => {
      resourceLogger.socket({
        resource: "students",
        action: "bulk-delete",
        event: "student:batch-upsert",
        payload: {
          error: error instanceof Error ? error.message : String(error),
        },
      })
    })

    await notifySuperAdminsOfBulkStudentAction(
      "delete",
      ctx.actorId,
      result.count,
      students
    )

    resourceLogger.actionFlow({
      resource: "students",
      action: "bulk-delete",
      step: "success",
      duration: Date.now() - startTime,
      metadata: { requestedCount: ids.length, affectedCount: result.count },
    })
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

  resourceLogger.actionFlow({
    resource: "students",
    action: "restore",
    step: "start",
    metadata: { studentId: id, actorId: ctx.actorId },
  })

  ensurePermission(ctx, PERMISSIONS.STUDENTS_UPDATE, PERMISSIONS.STUDENTS_MANAGE)

  const student = await prisma.student.findUnique({ where: { id } })
  if (!student || !student.deletedAt) {
    resourceLogger.actionFlow({
      resource: "students",
      action: "restore",
      step: "error",
      metadata: { studentId: id, error: "Học sinh không tồn tại hoặc chưa bị xóa" },
    })
    throw new NotFoundError("Học sinh không tồn tại hoặc chưa bị xóa")
  }

  const previousStatus: "active" | "deleted" = student.deletedAt ? "deleted" : "active"

  await prisma.student.update({
    where: { id },
    data: {
      deletedAt: null,
    },
  })

  resourceLogger.cache({
    resource: "students",
    action: "cache-invalidate",
    operation: "invalidate",
    resourceId: id,
    tags: ["students", `student-${id}`, "active-students", "deleted-students"],
  })
  await invalidateResourceCache({
    resource: "students",
    id,
    additionalTags: ["active-students", "deleted-students"],
  })

  resourceLogger.socket({
    resource: "students",
    action: "restore",
    event: "student:upsert",
    resourceId: id,
    payload: { studentId: id, previousStatus, newStatus: "active" },
  })
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

  resourceLogger.actionFlow({
    resource: "students",
    action: "restore",
    step: "success",
    duration: Date.now() - startTime,
    metadata: { studentId: id, studentCode: student.studentCode, studentName: student.name },
  })
}

export async function bulkRestoreStudents(ctx: AuthContext, ids: string[]): Promise<BulkActionResult> {
  const startTime = Date.now()

  resourceLogger.actionFlow({
    resource: "students",
    action: "bulk-restore",
    step: "start",
    metadata: { count: ids.length, studentIds: ids, actorId: ctx.actorId },
  })

  ensurePermission(ctx, PERMISSIONS.STUDENTS_UPDATE, PERMISSIONS.STUDENTS_MANAGE)

  if (!ids || ids.length === 0) {
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

    resourceLogger.actionFlow({
      resource: "students",
      action: "bulk-restore",
      step: "error",
      metadata: {
        requestedCount: ids.length,
        foundCount: allRequestedStudents.length,
        softDeletedCount: softDeletedStudents.length,
        activeCount: activeStudents.length,
        notFoundCount,
        error: errorMessage,
      },
    })

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

  resourceLogger.cache({
    resource: "students",
    action: "cache-invalidate",
    operation: "invalidate",
    tags: ["students", "active-students", "deleted-students"],
  })
  await invalidateResourceCacheBulk({
    resource: "students",
    additionalTags: ["active-students", "deleted-students"],
  })

  if (result.count > 0 && studentsToRestore.length > 0) {
    resourceLogger.socket({
      resource: "students",
      action: "bulk-restore",
      event: "student:batch-upsert",
      payload: {
        studentIds: studentsToRestore.map((s) => s.id),
        previousStatus: "deleted",
        count: studentsToRestore.length,
      },
    })
    await emitStudentBatchUpsert(
      studentsToRestore.map((s) => s.id),
      "deleted"
    ).catch((error) => {
      resourceLogger.socket({
        resource: "students",
        action: "bulk-restore",
        event: "student:batch-upsert",
        payload: {
          error: error instanceof Error ? error.message : String(error),
        },
      })
    })

    await notifySuperAdminsOfBulkStudentAction(
      "restore",
      ctx.actorId,
      result.count,
      studentsToRestore
    )

    resourceLogger.actionFlow({
      resource: "students",
      action: "bulk-restore",
      step: "success",
      duration: Date.now() - startTime,
      metadata: { requestedCount: ids.length, affectedCount: result.count },
    })
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

  resourceLogger.actionFlow({
    resource: "students",
    action: "hard-delete",
    step: "start",
    metadata: { studentId: id, actorId: ctx.actorId },
  })

  if (!canPerformAnyAction(ctx.permissions, ctx.roles, [PERMISSIONS.STUDENTS_MANAGE])) {
    throw new ForbiddenError()
  }

  const student = await prisma.student.findUnique({
    where: { id },
    select: { id: true, studentCode: true, name: true, deletedAt: true },
  })

  if (!student) {
    resourceLogger.actionFlow({
      resource: "students",
      action: "hard-delete",
      step: "error",
      metadata: { studentId: id, error: "Học sinh không tồn tại" },
    })
    throw new NotFoundError("Học sinh không tồn tại")
  }

  const previousStatus: "active" | "deleted" = student.deletedAt ? "deleted" : "active"

  await prisma.student.delete({
    where: { id },
  })

  resourceLogger.cache({
    resource: "students",
    action: "cache-invalidate",
    operation: "invalidate",
    resourceId: id,
    tags: ["students", `student-${id}`, "active-students", "deleted-students"],
  })
  await invalidateResourceCache({
    resource: "students",
    id,
    additionalTags: ["active-students", "deleted-students"],
  })

  resourceLogger.socket({
    resource: "students",
    action: "hard-delete",
    event: "student:remove",
    resourceId: id,
    payload: { studentId: id, previousStatus },
  })
  emitStudentRemove(id, previousStatus)

  await notifySuperAdminsOfStudentAction(
    "hard-delete",
    ctx.actorId,
    student
  )

  resourceLogger.actionFlow({
    resource: "students",
    action: "hard-delete",
    step: "success",
    duration: Date.now() - startTime,
    metadata: { studentId: id, studentCode: student.studentCode },
  })
}

export async function bulkHardDeleteStudents(ctx: AuthContext, ids: string[]): Promise<BulkActionResult> {
  const startTime = Date.now()

  resourceLogger.actionFlow({
    resource: "students",
    action: "bulk-hard-delete",
    step: "start",
    metadata: { count: ids.length, studentIds: ids, actorId: ctx.actorId },
  })

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

  resourceLogger.actionFlow({
    resource: "students",
    action: "bulk-hard-delete",
    step: "start",
    metadata: {
      requestedCount: ids.length,
      foundCount: students.length,
      notFoundCount: notFoundIds.length,
      requestedIds: ids,
      foundIds,
      notFoundIds,
    },
  })

  if (students.length === 0) {
    const errorMessage = `Không tìm thấy học sinh nào để xóa vĩnh viễn`
    resourceLogger.actionFlow({
      resource: "students",
      action: "bulk-hard-delete",
      step: "error",
      metadata: {
        requestedCount: ids.length,
        foundCount: students.length,
        notFoundCount: notFoundIds.length,
        error: errorMessage,
      },
    })
    throw new ApplicationError(errorMessage, 400)
  }

  const result = await prisma.student.deleteMany({
    where: {
      id: { in: students.map((s) => s.id) },
    },
  })

  resourceLogger.cache({
    resource: "students",
    action: "cache-invalidate",
    operation: "invalidate",
    tags: ["students", "active-students", "deleted-students"],
  })
  await invalidateResourceCacheBulk({
    resource: "students",
    additionalTags: ["active-students", "deleted-students"],
  })

  if (result.count > 0 && students.length > 0) {
    students.forEach((student) => {
      const previousStatus: "active" | "deleted" = student.deletedAt ? "deleted" : "active"
      try {
        emitStudentRemove(student.id, previousStatus)
      } catch (error) {
        resourceLogger.socket({
          resource: "students",
          action: "bulk-hard-delete",
          event: "student:remove",
          resourceId: student.id,
          payload: {
            studentId: student.id,
            studentCode: student.studentCode,
            error: error instanceof Error ? error.message : String(error),
          },
        })
      }
    })

    await notifySuperAdminsOfBulkStudentAction(
      "hard-delete",
      ctx.actorId,
      result.count,
      students
    )

    resourceLogger.actionFlow({
      resource: "students",
      action: "bulk-hard-delete",
      step: "success",
      duration: Date.now() - startTime,
      metadata: { requestedCount: ids.length, affectedCount: result.count },
    })
  }

  // Format message với tên học sinh
  const namesText = students.length > 0 ? formatStudentNames(students, 3) : ""
  const message = namesText
    ? `Đã xóa vĩnh viễn ${result.count} học sinh: ${namesText}`
    : `Đã xóa vĩnh viễn ${result.count} học sinh`
  
  return { success: true, message, affected: result.count }
}

