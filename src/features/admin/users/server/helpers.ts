/**
 * Helper Functions for Users Server Logic
 * 
 * Chứa các helper functions được dùng chung bởi queries, cache, và mutations
 * Sử dụng generic helpers từ resources/server khi có thể
 */

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

  // Apply status filter
  applyStatusFilter(where, params.status)

  // Apply search filter
  applySearchFilter(where, params.search, ["email", "name"])

  // Apply custom filters
  if (params.filters) {
    const activeFilters = Object.entries(params.filters).filter(([, value]) => Boolean(value))
    for (const [key, rawValue] of activeFilters) {
      const value = rawValue?.trim()
      if (!value) continue

      switch (key) {
        case "email":
        case "name":
          applyStringFilter(where, key, value)
          break
        case "roles":
          where.userRoles = {
            some: {
              role: { name: value },
            },
          }
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

