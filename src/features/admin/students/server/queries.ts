/**
 * Non-cached Database Queries for Students
 * 
 * Chứa các database queries không có cache wrapper
 * Sử dụng cho các trường hợp cần fresh data hoặc trong API routes
 */

import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/database"
import { validatePagination } from "@/features/admin/resources/server"
import { mapStudentRecord, buildWhereClause } from "./helpers"
import type { ListStudentsInput, StudentDetail, ListStudentsResult } from "../types"

export async function listStudents(params: ListStudentsInput = {}): Promise<ListStudentsResult> {
  const { page, limit } = validatePagination(params.page, params.limit, 100)
  const where = buildWhereClause(params)

  const [data, total] = await Promise.all([
    prisma.student.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.student.count({ where }),
  ])

  const totalPages = Math.ceil(total / limit)

  return {
    rows: data.map(mapStudentRecord),
    total,
    page,
    limit,
    totalPages,
  }
}

/**
 * Get unique values for a specific column (for filter options)
 */
export async function getStudentColumnOptions(
  column: string,
  search?: string,
  limit: number = 50
): Promise<Array<{ label: string; value: string }>> {
  const where: Prisma.StudentWhereInput = {
    deletedAt: null, // Only active students
  }

  // Add search filter if provided
  if (search && search.trim()) {
    const searchValue = search.trim()
    switch (column) {
      case "studentCode":
        where.studentCode = { contains: searchValue, mode: "insensitive" }
        break
      case "name":
        where.name = { contains: searchValue, mode: "insensitive" }
        break
      case "email":
        where.email = { contains: searchValue, mode: "insensitive" }
        break
      default:
        where.studentCode = { contains: searchValue, mode: "insensitive" }
    }
  }

  // Build select based on column
  let selectField: Prisma.StudentSelect
  switch (column) {
    case "studentCode":
      selectField = { studentCode: true }
      break
    case "name":
      selectField = { name: true }
      break
    case "email":
      selectField = { email: true }
      break
    default:
      selectField = { studentCode: true }
  }

  const results = await prisma.student.findMany({
    where,
    select: selectField,
    orderBy: { [column]: "asc" },
    take: limit,
  })

  // Map results to options format
  return results
    .map((item) => {
      const value = item[column as keyof typeof item]
      if (typeof value === "string" && value.trim()) {
        return {
          label: value,
          value: value,
        }
      }
      return null
    })
    .filter((item): item is { label: string; value: string } => item !== null)
}

export async function getStudentById(id: string): Promise<StudentDetail | null> {
  const student = await prisma.student.findUnique({
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

  if (!student) {
    return null
  }

  return {
    ...mapStudentRecord(student),
    userName: student.user?.name || null,
    userEmail: student.user?.email || null,
  }
}

