/**
 * Non-cached Database Queries for Users
 * 
 * Chứa các database queries không có cache wrapper
 * Sử dụng cho các trường hợp cần fresh data hoặc trong API routes
 */

import { prisma } from "@/lib/database"
import { validatePagination, buildPagination, type ResourcePagination } from "@/features/admin/resources/server"
import { mapUserRecord, buildWhereClause } from "./helpers"

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

export interface UserDetail extends ListedUser {
  bio: string | null
  phone: string | null
  address: string | null
  emailVerified: Date | null
  updatedAt: Date
}

export interface ListUsersResult {
  data: ListedUser[]
  pagination: ResourcePagination
}

export async function listUsers(params: ListUsersInput = {}): Promise<ListUsersResult> {
  const { page, limit } = validatePagination(params.page, params.limit, 100)
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
    pagination: buildPagination(page, limit, total),
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

// Re-export helpers for convenience
export { mapUserRecord, type UserWithRoles } from "./helpers"
