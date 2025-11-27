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
import type { ListRolesInput, ListedRole, RoleDetail, ListRolesResult } from "./queries"
import type { RoleRow } from "../types"

type RoleWithRelations = Prisma.RoleGetPayload<Record<string, never>>

export function mapRoleRecord(role: RoleWithRelations): ListedRole {
  return {
    id: role.id,
    name: role.name,
    displayName: role.displayName,
    description: role.description,
    permissions: role.permissions,
    isActive: role.isActive,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
    deletedAt: role.deletedAt,
  }
}

export function buildWhereClause(params: ListRolesInput): Prisma.RoleWhereInput {
  const where: Prisma.RoleWhereInput = {}

  // Apply status filter
  applyStatusFilter(where, params.status)

  // Apply search filter
  applySearchFilter(where, params.search, ["name", "displayName", "description"])

  // Apply custom filters
  if (params.filters) {
    const activeFilters = Object.entries(params.filters).filter(([, value]) => Boolean(value))
    for (const [key, rawValue] of activeFilters) {
      const value = rawValue?.trim()
      if (!value) continue

      switch (key) {
        case "name":
        case "displayName":
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

export function serializeRoleForTable(role: ListedRole | { id: string; name: string; displayName: string; description: string | null; permissions: string[]; isActive: boolean; createdAt: Date | string; updatedAt?: Date | string; deletedAt: Date | string | null }): RoleRow {
  return {
    id: role.id,
    name: role.name,
    displayName: role.displayName,
    description: role.description,
    permissions: role.permissions,
    isActive: role.isActive,
    createdAt: serializeDate(role.createdAt)!,
    updatedAt: role.updatedAt ? (serializeDate(role.updatedAt) ?? undefined) : undefined, // Thêm updatedAt để so sánh cache chính xác (convert null to undefined)
    deletedAt: serializeDate(role.deletedAt),
  }
}

export function serializeRolesList(data: ListRolesResult): DataTableResult<RoleRow> {
  return {
    page: data.pagination.page,
    limit: data.pagination.limit,
    total: data.pagination.total,
    totalPages: data.pagination.totalPages,
    rows: data.data.map(serializeRoleForTable),
  }
}

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

