/**
 * Non-cached Database Queries for Roles
 * 
 * Chứa các database queries không có cache wrapper
 * Sử dụng cho các trường hợp cần fresh data hoặc trong API routes
 */

import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/database"
import { validatePagination, buildPagination, type ResourcePagination } from "@/features/admin/resources/server"
import { mapRoleRecord, buildWhereClause } from "./helpers"

export interface ListRolesInput {
  page?: number
  limit?: number
  search?: string
  filters?: Record<string, string>
  status?: "active" | "deleted" | "all"
}

export interface ListedRole {
  id: string
  name: string
  displayName: string
  description: string | null
  permissions: string[]
  isActive: boolean
  createdAt: Date
  deletedAt: Date | null
}

export interface RoleDetail extends ListedRole {
  updatedAt: Date
}

export interface ListRolesResult {
  data: ListedRole[]
  pagination: ResourcePagination
}

export async function listRoles(params: ListRolesInput = {}): Promise<ListRolesResult> {
  const { page, limit } = validatePagination(params.page, params.limit, 100)
  const where = buildWhereClause(params)

  const [roles, total] = await Promise.all([
    prisma.role.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.role.count({ where }),
  ])

  return {
    data: roles.map(mapRoleRecord),
    pagination: buildPagination(page, limit, total),
  }
}

/**
 * Get unique values for a specific column (for filter options)
 */
export async function getRoleColumnOptions(
  column: string,
  search?: string,
  limit: number = 50
): Promise<Array<{ label: string; value: string }>> {
  const where: Prisma.RoleWhereInput = {
    deletedAt: null, // Only active roles
  }

  // Add search filter if provided
  if (search && search.trim()) {
    const searchValue = search.trim()
    switch (column) {
      case "name":
        where.name = { contains: searchValue, mode: "insensitive" }
        break
      case "displayName":
        where.displayName = { contains: searchValue, mode: "insensitive" }
        break
      default:
        where.name = { contains: searchValue, mode: "insensitive" }
    }
  }

  // Build select based on column
  let selectField: Prisma.RoleSelect
  switch (column) {
    case "name":
      selectField = { name: true }
      break
    case "displayName":
      selectField = { displayName: true }
      break
    default:
      selectField = { name: true }
  }

  const results = await prisma.role.findMany({
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

export async function getRoleById(id: string): Promise<ListedRole | null> {
  const role = await prisma.role.findUnique({
    where: { id },
  })

  if (!role) {
    return null
  }

  return mapRoleRecord(role)
}

// Re-export helpers for convenience
export { mapRoleRecord, type RoleWithRelations } from "./helpers"

