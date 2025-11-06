/**
 * Helper Functions for Users Server Logic
 * 
 * Chứa các helper functions được dùng chung bởi queries, cache, và mutations
 * Sử dụng generic helpers từ resources/server khi có thể
 */

import type { Prisma } from "@prisma/client"
import type { DataTableResult } from "@/components/tables"
import { serializeDate } from "@/features/admin/resources/server"
import type { ListUsersInput, ListedUser, UserDetail, ListUsersResult } from "./queries"
import type { UserRow } from "../types"

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

/**
 * Map Prisma user record to ListedUser format
 */
export function mapUserRecord(user: UserWithRoles): ListedUser {
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

/**
 * Build Prisma where clause from ListUsersInput
 */
export function buildWhereClause(params: ListUsersInput): Prisma.UserWhereInput {
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
          where.userRoles = {
            some: {
              role: { name: value },
            },
          }
          break
        case "isActive":
          if (value === "true" || value === "1") where.isActive = true
          else if (value === "false" || value === "0") where.isActive = false
          break
        case "status":
          if (value === "deleted") where.deletedAt = { not: null }
          else if (value === "active") where.deletedAt = null
          break
        case "createdAt":
        case "deletedAt":
          try {
            const filterDate = new Date(value)
            if (!isNaN(filterDate.getTime())) {
              const startOfDay = new Date(filterDate)
              startOfDay.setHours(0, 0, 0, 0)
              const endOfDay = new Date(filterDate)
              endOfDay.setHours(23, 59, 59, 999)
              where[key === "createdAt" ? "createdAt" : "deletedAt"] = {
                gte: startOfDay,
                lte: endOfDay,
              }
            }
          } catch {
            // Invalid date format, skip filter
          }
          break
      }
    }
  }

  return where
}

/**
 * Serialize user data for DataTable format
 */
export function serializeUserForTable(user: ListedUser): UserRow {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    isActive: user.isActive,
    createdAt: serializeDate(user.createdAt)!,
    deletedAt: serializeDate(user.deletedAt),
    roles: user.roles.map((role) => ({
      id: role.id,
      name: role.name,
      displayName: role.displayName,
    })),
  }
}

/**
 * Serialize ListUsersResult to DataTable format
 * Sử dụng pattern từ resources/server nhưng customize cho users
 */
export function serializeUsersList(data: ListUsersResult): DataTableResult<UserRow> {
  return {
    page: data.pagination.page,
    limit: data.pagination.limit,
    total: data.pagination.total,
    totalPages: data.pagination.totalPages,
    rows: data.data.map(serializeUserForTable),
  }
}

/**
 * Serialize UserDetail to client format
 */
export function serializeUserDetail(user: UserDetail) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    bio: user.bio,
    phone: user.phone,
    address: user.address,
    isActive: user.isActive,
    createdAt: serializeDate(user.createdAt)!,
    updatedAt: serializeDate(user.updatedAt)!,
    deletedAt: serializeDate(user.deletedAt),
    emailVerified: serializeDate(user.emailVerified),
    roles: user.roles,
  }
}

export type { UserWithRoles }

