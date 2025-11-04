import { cache } from "react"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/database"

export interface ListUsersInput {
  page?: number
  limit?: number
  search?: string
  filters?: Record<string, string>
  status?: "active" | "deleted" | "all"
}

export interface ListedUser {
  id: string
  email: string
  name: string | null
  avatar: string | null
  isActive: boolean
  createdAt: Date
  deletedAt: Date | null
  roles: Array<{
    id: string
    name: string
    displayName: string
  }>
}

export interface ListUsersResult {
  data: ListedUser[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

type UserWithRoles = Prisma.UserGetPayload<{
  include: {
    userRoles: {
      include: {
        role: {
          select: {
            id: true
            name: true
            displayName: true
          }
        }
      }
    }
  }
}>

function mapUserRecord(user: UserWithRoles): ListedUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    isActive: user.isActive,
    createdAt: user.createdAt,
    deletedAt: user.deletedAt,
    roles: user.userRoles.map((ur) => ur.role),
  }
}

function buildWhereClause(params: ListUsersInput): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = {}
  const status = params.status ?? "active"

  if (status === "active") {
    where.deletedAt = null
  } else if (status === "deleted") {
    where.deletedAt = { not: null }
  }

  if (params.search) {
    const searchValue = params.search.trim()
    if (searchValue.length > 0) {
      where.OR = [
        { email: { contains: searchValue, mode: "insensitive" } },
        { name: { contains: searchValue, mode: "insensitive" } },
      ]
    }
  }

  if (params.filters) {
    const activeFilters = Object.entries(params.filters).filter(([, value]) => Boolean(value))
    for (const [key, rawValue] of activeFilters) {
      const value = rawValue?.trim()
      if (!value) continue

      switch (key) {
        case "email":
          where.email = { contains: value, mode: "insensitive" }
          break
        case "name":
          where.name = { contains: value, mode: "insensitive" }
          break
        case "roles":
          // Filter by role name
          where.userRoles = {
            some: {
              role: {
                name: value,
              },
            },
          }
          break
        case "isActive":
          if (value === "true" || value === "1") where.isActive = true
          else if (value === "false" || value === "0") where.isActive = false
          break
        case "status":
          if (value === "deleted") {
            where.deletedAt = { not: null }
          } else if (value === "active") {
            where.deletedAt = null
          }
          break
        case "createdAt":
          // Date filter value is in format yyyy-MM-dd
          try {
            const filterDate = new Date(value)
            if (!isNaN(filterDate.getTime())) {
              // Filter for records created on the selected date
              const startOfDay = new Date(filterDate)
              startOfDay.setHours(0, 0, 0, 0)
              const endOfDay = new Date(filterDate)
              endOfDay.setHours(23, 59, 59, 999)
              where.createdAt = {
                gte: startOfDay,
                lte: endOfDay,
              }
            }
          } catch {
            // Invalid date format, skip filter
          }
          break
        case "deletedAt":
          // Date filter value is in format yyyy-MM-dd
          try {
            const filterDate = new Date(value)
            if (!isNaN(filterDate.getTime())) {
              // Filter for records deleted on the selected date
              const startOfDay = new Date(filterDate)
              startOfDay.setHours(0, 0, 0, 0)
              const endOfDay = new Date(filterDate)
              endOfDay.setHours(23, 59, 59, 999)
              where.deletedAt = {
                gte: startOfDay,
                lte: endOfDay,
              }
            }
          } catch {
            // Invalid date format, skip filter
          }
          break
        default:
          break
      }
    }
  }

  return where
}

export async function listUsers(params: ListUsersInput = {}): Promise<ListUsersResult> {
  const page = Math.max(1, params.page ?? 1)
  const limit = Math.max(1, Math.min(params.limit ?? 10, 100))
  const where = buildWhereClause(params)

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        userRoles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
                displayName: true,
              },
            },
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ])

  return {
    data: users.map(mapUserRecord),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

export async function getUserById(id: string): Promise<ListedUser | null> {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      userRoles: {
        include: {
          role: {
            select: {
              id: true,
              name: true,
              displayName: true,
            },
          },
        },
      },
    },
  })

  if (!user) {
    return null
  }

  return mapUserRecord(user)
}

export const listUsersCached = cache(
  async (page: number, limit: number, search: string, filtersKey: string, status: string) => {
    const filters = filtersKey ? (JSON.parse(filtersKey) as Record<string, string>) : undefined
    const parsedStatus = status === "deleted" || status === "all" ? status : "active"
    return listUsers({
      page,
      limit,
      search: search || undefined,
      filters,
      status: parsedStatus,
    })
  },
)

export { mapUserRecord, type UserWithRoles }
