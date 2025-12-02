import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/database"
import { validatePagination, buildPagination } from "@/features/admin/resources/server"
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
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.student.count({ where }),
  ])

  const pagination = buildPagination(page, limit, total)

  return {
    rows: data.map(mapStudentRecord),
    total: pagination.total,
    page: pagination.page,
    limit: pagination.limit,
    totalPages: pagination.totalPages,
  }
}

export async function getStudentColumnOptions(
  column: string,
  search?: string,
  limit: number = 50,
  actorId?: string,
  isSuperAdmin?: boolean
): Promise<Array<{ label: string; value: string }>> {
  const where: Prisma.StudentWhereInput = {
    deletedAt: null, // Only active students
  }

  if (!isSuperAdmin && actorId) {
    where.userId = actorId
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

export async function getStudentById(
  id: string,
  actorId?: string,
  isSuperAdmin?: boolean
): Promise<StudentDetail | null> {
  const where: Prisma.StudentWhereUniqueInput = { id }
  
  // If not super admin, add userId filter to ensure user can only access their own students
  // So we'll check after fetching
  const student = await prisma.student.findUnique({
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
  })

  if (!student) {
    return null
  }

  if (!isSuperAdmin && actorId && student.userId !== actorId) {
    return null
  }

  return {
    ...mapStudentRecord(student),
    userName: student.user?.name || null,
    userEmail: student.user?.email || null,
  }
}

