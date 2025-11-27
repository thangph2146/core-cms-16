import type { Prisma } from "@prisma/client"
import type { DataTableResult } from "@/components/tables"
import {
  serializeDate,
  applyStatusFilter,
  applySearchFilter,
  applyDateFilter,
  applyStringFilter,
  applyBooleanFilter,
  applyStatusFilterFromFilters,
} from "@/features/admin/resources/server"
import type { ListStudentsInput, ListedStudent, StudentDetail, ListStudentsResult } from "../types"
import type { StudentRow } from "../types"

type StudentWithRelations = Prisma.StudentGetPayload<{
  include: {
    user: {
      select: {
        id: true
        name: true
        email: true
      }
    }
  }
}>

export function mapStudentRecord(student: StudentWithRelations): ListedStudent {
  return {
    id: student.id,
    userId: student.userId,
    name: student.name,
    email: student.email,
    studentCode: student.studentCode,
    isActive: student.isActive,
    createdAt: student.createdAt.toISOString(),
    updatedAt: student.updatedAt.toISOString(),
    deletedAt: student.deletedAt ? student.deletedAt.toISOString() : null,
  }
}

export function buildWhereClause(params: ListStudentsInput): Prisma.StudentWhereInput {
  const where: Prisma.StudentWhereInput = {}

  // Apply status filter
  applyStatusFilter(where, params.status)

  // Filter by userId if not super admin
  if (!params.isSuperAdmin && params.actorId) {
    where.userId = params.actorId
  }

  // Apply search filter
  applySearchFilter(where, params.search, ["name", "email", "studentCode"])

  // Apply custom filters
  if (params.filters) {
    const activeFilters = Object.entries(params.filters).filter(([, value]) => Boolean(value))
    for (const [key, rawValue] of activeFilters) {
      const value = typeof rawValue === "string" ? rawValue.trim() : ""
      if (!value) continue

      switch (key) {
        case "name":
        case "email":
        case "studentCode":
          applyStringFilter(where, key, value)
          break
        case "isActive":
          applyBooleanFilter(where, key, value)
          break
        case "status":
          applyStatusFilterFromFilters(where, value)
          break
        case "createdAt":
        case "deletedAt":
          applyDateFilter(where, key, value)
          break
      }
    }
  }

  return where
}

export function serializeStudentForTable(student: ListedStudent | { id: string; userId: string | null; name: string | null; email: string | null; studentCode: string; isActive: boolean; createdAt: Date | string; deletedAt: Date | string | null }): StudentRow {
  return {
    id: student.id,
    userId: student.userId,
    name: student.name,
    email: student.email,
    studentCode: student.studentCode,
    isActive: student.isActive,
    createdAt: serializeDate(student.createdAt)!,
    deletedAt: serializeDate(student.deletedAt),
  }
}

export function serializeStudentsList(data: ListStudentsResult): DataTableResult<StudentRow> {
  return {
    page: data.page,
    limit: data.limit,
    total: data.total,
    totalPages: data.totalPages,
    rows: data.rows.map(serializeStudentForTable),
  }
}

export function serializeStudentDetail(student: StudentDetail) {
  return {
    id: student.id,
    userId: student.userId,
    name: student.name,
    email: student.email,
    studentCode: student.studentCode,
    isActive: student.isActive,
    createdAt: serializeDate(student.createdAt)!,
    updatedAt: serializeDate(student.updatedAt)!,
    deletedAt: serializeDate(student.deletedAt),
    userName: student.userName,
    userEmail: student.userEmail,
  }
}

export type { StudentWithRelations }

