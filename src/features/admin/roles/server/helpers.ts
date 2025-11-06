/**
 * Helper Functions for Roles Server Logic
 * 
 * Chứa các helper functions được dùng chung bởi queries, cache, và mutations
 * Sử dụng generic helpers từ resources/server khi có thể
 */

import type { Prisma } from "@prisma/client"
import type { DataTableResult } from "@/components/tables"
import { serializeDate } from "@/features/admin/resources/server"
import type { ListRolesInput, ListedRole, RoleDetail, ListRolesResult } from "./queries"
import type { RoleRow } from "../types"

type RoleWithRelations = Prisma.RoleGetPayload<Record<string, never>>

/**
 * Map Prisma role record to ListedRole format
 */
export function mapRoleRecord(role: RoleWithRelations): ListedRole {
  return {
    id: role.id,
    name: role.name,
    displayName: role.displayName,
    description: role.description,
    permissions: role.permissions,
    isActive: role.isActive,
    createdAt: role.createdAt,
    deletedAt: role.deletedAt,
  }
}

/**
 * Build Prisma where clause from ListRolesInput
 */
export function buildWhereClause(params: ListRolesInput): Prisma.RoleWhereInput {
  const where: Prisma.RoleWhereInput = {}
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
        { name: { contains: searchValue, mode: "insensitive" } },
        { displayName: { contains: searchValue, mode: "insensitive" } },
        { description: { contains: searchValue, mode: "insensitive" } },
      ]
    }
  }

  if (params.filters) {
    const activeFilters = Object.entries(params.filters).filter(([, value]) => Boolean(value))
    for (const [key, rawValue] of activeFilters) {
      const value = rawValue?.trim()
      if (!value) continue

      switch (key) {
        case "name":
          where.name = { contains: value, mode: "insensitive" }
          break
        case "displayName":
          where.displayName = { contains: value, mode: "insensitive" }
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
 * Serialize role data for DataTable format
 */
export function serializeRoleForTable(role: ListedRole): RoleRow {
  return {
    id: role.id,
    name: role.name,
    displayName: role.displayName,
    description: role.description,
    permissions: role.permissions,
    isActive: role.isActive,
    createdAt: serializeDate(role.createdAt)!,
    deletedAt: serializeDate(role.deletedAt),
  }
}

/**
 * Serialize ListRolesResult to DataTable format
 * Sử dụng pattern từ resources/server nhưng customize cho roles
 */
export function serializeRolesList(data: ListRolesResult): DataTableResult<RoleRow> {
  return {
    page: data.pagination.page,
    limit: data.pagination.limit,
    total: data.pagination.total,
    totalPages: data.pagination.totalPages,
    rows: data.data.map(serializeRoleForTable),
  }
}

/**
 * Serialize RoleDetail to client format
 */
export function serializeRoleDetail(role: RoleDetail) {
  return {
    id: role.id,
    name: role.name,
    displayName: role.displayName,
    description: role.description,
    permissions: role.permissions,
    isActive: role.isActive,
    createdAt: serializeDate(role.createdAt)!,
    updatedAt: serializeDate(role.updatedAt)!,
    deletedAt: serializeDate(role.deletedAt),
  }
}

export type { RoleWithRelations }

