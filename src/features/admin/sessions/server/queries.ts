import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/database"
import { validatePagination } from "@/features/admin/resources/server"
import { mapSessionRecord, buildWhereClause } from "./helpers"
import type { ListSessionsInput, SessionDetail, ListSessionsResult } from "../types"

export async function listSessions(params: ListSessionsInput = {}): Promise<ListSessionsResult> {
  const { page, limit } = validatePagination(params.page, params.limit, 100)
  const where = buildWhereClause(params)

  const [data, total] = await Promise.all([
    prisma.session.findMany({
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
    prisma.session.count({ where }),
  ])

  const totalPages = Math.ceil(total / limit)

  // Map với user info
  const rows = data.map((session) => {
    const mapped = mapSessionRecord(session)
    return {
      ...mapped,
      userName: session.user?.name || null,
      userEmail: session.user?.email || "",
    }
  })

  return {
    rows,
    total,
    page,
    limit,
    totalPages,
  }
}

export async function getSessionColumnOptions(
  column: string,
  search?: string,
  limit: number = 50
): Promise<Array<{ label: string; value: string }>> {
  const where: Prisma.SessionWhereInput = {
    isActive: true, // Only active sessions
  }

  // Add search filter if provided
  if (search && search.trim()) {
    const searchValue = search.trim()
    switch (column) {
      case "userAgent":
        where.userAgent = { contains: searchValue, mode: "insensitive" }
        break
      case "ipAddress":
        where.ipAddress = { contains: searchValue, mode: "insensitive" }
        break
      default:
        where.userAgent = { contains: searchValue, mode: "insensitive" }
    }
  }

  // Build select based on column
  let selectField: Prisma.SessionSelect
  switch (column) {
    case "userAgent":
      selectField = { userAgent: true }
      break
    case "ipAddress":
      selectField = { ipAddress: true }
      break
    default:
      selectField = { userAgent: true }
  }

  const results = await prisma.session.findMany({
    where,
    select: selectField,
    orderBy: { [column]: "asc" },
    take: limit,
  })

  // Remove duplicates manually
  const uniqueValues = new Set<string>()
  const uniqueResults = results.filter((item) => {
    const value = item[column as keyof typeof item]
    if (typeof value === "string" && value.trim()) {
      if (uniqueValues.has(value)) {
        return false
      }
      uniqueValues.add(value)
      return true
    }
    return false
  })

  // Map results to options format
  return uniqueResults
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

export async function getSessionById(id: string): Promise<SessionDetail | null> {
  const session = await prisma.session.findUnique({
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

  if (!session) {
    return null
  }

  return {
    ...mapSessionRecord(session),
    userName: session.user?.name || null,
    userEmail: session.user?.email || "",
  }
}

