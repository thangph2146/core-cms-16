/**
 * Cache Functions for Roles
 * 
 * Sử dụng React cache() để:
 * - Tự động deduplicate requests trong cùng một render pass
 * - Cache kết quả để tái sử dụng
 * - Cải thiện performance với request deduplication
 * 
 * Pattern: Server Component → Cache Function → Database Query
 */

import { cache } from "react"
import { listRoles, type RoleDetail } from "./queries"
import { mapRoleRecord } from "./helpers"
import { prisma } from "@/lib/database"

/**
 * Cache function: List roles with pagination
 * 
 * Sử dụng cache() để tự động deduplicate requests và cache kết quả
 */
export const listRolesCached = cache(
  async (page: number, limit: number, search: string, filtersKey: string, status: string) => {
    const filters = filtersKey ? (JSON.parse(filtersKey) as Record<string, string>) : undefined
    const parsedStatus = status === "deleted" || status === "all" ? status : "active"
    return listRoles({
      page,
      limit,
      search: search || undefined,
      filters,
      status: parsedStatus,
    })
  },
)

/**
 * Cache function: Get role detail by ID
 * 
 * Sử dụng cache() để tự động deduplicate requests và cache kết quả
 * 
 * @param id - Role ID
 * @returns Role detail hoặc null nếu không tìm thấy
 */
export const getRoleDetailById = cache(async (id: string): Promise<RoleDetail | null> => {
  const role = await prisma.role.findUnique({
    where: { id },
  })

  if (!role) {
    return null
  }

  // Map role record to RoleDetail format
  return {
    ...mapRoleRecord(role),
    updatedAt: role.updatedAt,
  }
})

/**
 * Cache function: Get all available permissions (flat list)
 * 
 * Sử dụng cache() để tự động deduplicate requests và cache kết quả
 * Dùng cho form options, filters, etc.
 * 
 * @returns Array of all permissions
 */
export const getAllPermissionsCached = cache(async () => {
  // Import permissions from lib
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

  return Object.entries(PERMISSIONS)
    .map(([_key, value]) => {
      const [resource, action] = String(value).split(":")
      const resourceLabel = resourceLabels[resource] || resource
      const actionLabel = actionLabels[action] || action
      const label = `${actionLabel} - ${resourceLabel}`
      
      return {
        label,
        value: String(value),
      }
    })
    .sort((a, b) => a.label.localeCompare(b.label))
})

