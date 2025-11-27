/**
 * Non-cached Database Queries for Roles
 * 
 * Chứa các database queries không có cache wrapper
 * Sử dụng cho các trường hợp cần fresh data hoặc trong API routes
 */

import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/database"
import {
  validatePagination,
  buildPagination,
  type ResourcePagination,
  applyColumnOptionsStatusFilter,
  applyColumnOptionsSearchFilter,
  mapToColumnOptions,
} from "@/features/admin/resources/server"
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
  updatedAt: Date
  deletedAt: Date | null
}

export type RoleDetail = ListedRole

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
      orderBy: { updatedAt: "desc" },
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
  const where: Prisma.RoleWhereInput = {}

  // Apply status filter (default: active - column options thường chỉ cần active items)
  applyColumnOptionsStatusFilter(where, "active")

  // Apply search filter based on column
  if (search && search.trim()) {
    switch (column) {
      case "name":
        applyColumnOptionsSearchFilter(where, search, "name")
        break
      case "displayName":
        applyColumnOptionsSearchFilter(where, search, "displayName")
        break
      default:
        applyColumnOptionsSearchFilter(where, search, "name")
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
  return mapToColumnOptions(results, column)
}

/**
 * Get all available permissions as flat options (non-cached)
 * Theo chuẩn Next.js 16: không cache admin data
 */
export async function getAllPermissionsOptions(): Promise<Array<{ label: string; value: string }>> {
  const { PERMISSIONS } = await import("@/lib/permissions")
  
  // Map resource names to Vietnamese labels
  const resourceLabels: Record<string, string> = {
    dashboard: "Dashboard",
    users: "Người dùng",
    posts: "Bài viết",
    categories: "Danh mục",
    tags: "Thẻ",
    comments: "Bình luận",
    roles: "Vai trò",
    messages: "Tin nhắn",
    notifications: "Thông báo",
    contact_requests: "Liên hệ",
    students: "Học sinh",
    settings: "Cài đặt",
  }

  // Map action names to Vietnamese labels
  const actionLabels: Record<string, string> = {
    view: "Xem",
    create: "Tạo",
    update: "Cập nhật",
    delete: "Xóa",
    publish: "Xuất bản",
    approve: "Duyệt",
    assign: "Gán",
    manage: "Quản lý",
  }

  // Track unique permission values to avoid duplicates
  const seenValues = new Set<string>()
  
  return Object.entries(PERMISSIONS)
    .map(([_key, value]) => {
      const permissionValue = String(value)
      
      // Skip if we've already seen this permission value
      if (seenValues.has(permissionValue)) {
        return null
      }
      
      const [resource, action] = permissionValue.split(":")
      const resourceLabel = resourceLabels[resource] || resource
      const actionLabel = actionLabels[action] || action
      const label = `${actionLabel} - ${resourceLabel}`
      
      // Mark this permission value as seen
      seenValues.add(permissionValue)
      
      return {
        label,
        value: permissionValue,
      }
    })
    .filter((item): item is { label: string; value: string } => item !== null)
    .sort((a, b) => a.label.localeCompare(b.label))
}

export async function getRoleById(id: string): Promise<RoleDetail | null> {
  const role = await prisma.role.findUnique({
    where: { id },
  })

  if (!role) {
    return null
  }

  // mapRoleRecord đã include updatedAt
  return mapRoleRecord(role)
}

// Re-export helpers for convenience
export { mapRoleRecord, type RoleWithRelations } from "./helpers"

