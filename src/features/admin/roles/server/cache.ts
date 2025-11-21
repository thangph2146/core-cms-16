/**
 * Cache Functions for Roles
 * 
 * Sử dụng unstable_cache (Data Cache) kết hợp với React cache (Request Memoization)
 * - unstable_cache: Cache kết quả giữa các requests (Persisted Cache)
 * - React cache: Deduplicate requests trong cùng một render pass
 * 
 * Pattern: Server Component → Cache Function → Database Query
 */

import { cache } from "react"
import { unstable_cache } from "next/cache"
import { listRoles, getRoleColumnOptions, type RoleDetail, type ListRolesInput, type ListRolesResult } from "./queries"
import { mapRoleRecord } from "./helpers"
import { prisma } from "@/lib/database"

/**
 * Cache function: List roles with pagination
 * Caching strategy: Cache by params string
 */
export const listRolesCached = cache(async (params: ListRolesInput = {}): Promise<ListRolesResult> => {
  const cacheKey = JSON.stringify(params)
  return unstable_cache(
    async () => listRoles(params),
    ['roles-list', cacheKey],
    { 
      tags: ['roles'], 
      revalidate: 3600 
    }
  )()
})

/**
 * Cache function: Get role detail by ID
 * Caching strategy: Cache by ID
 */
export const getRoleDetailById = cache(async (id: string): Promise<RoleDetail | null> => {
  return unstable_cache(
    async () => {
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
    },
    [`role-${id}`],
    { 
      tags: ['roles', `role-${id}`],
      revalidate: 3600 
    }
  )()
})

/**
 * Cache function: Get all available permissions (flat list)
 * Caching strategy: Global permissions list (rarely changes)
 */
export const getAllPermissionsCached = cache(async () => {
  return unstable_cache(
    async () => {
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
    },
    ['all-permissions'],
    { 
      tags: ['permissions', 'roles'],
      revalidate: 86400 // 24 hours - permissions rarely change
    }
  )()
})

/**
 * Cache function: Get role column options for filters
 * Caching strategy: Cache by column and search
 */
export const getRoleColumnOptionsCached = cache(
  async (
    column: string,
    search?: string,
    limit: number = 50
  ): Promise<Array<{ label: string; value: string }>> => {
    const cacheKey = `${column}-${search || ''}-${limit}`
    return unstable_cache(
      async () => getRoleColumnOptions(column, search, limit),
      [`role-options-${cacheKey}`],
      { 
        tags: ['roles', 'role-options'],
        revalidate: 3600 
      }
    )()
  }
)
