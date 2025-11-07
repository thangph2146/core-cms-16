/**
 * Cache Functions for Users
 * 
 * Sử dụng React cache() để:
 * - Tự động deduplicate requests trong cùng một render pass
 * - Cache kết quả để tái sử dụng
 * - Cải thiện performance với request deduplication
 * 
 * Pattern: Server Component → Cache Function → Database Query
 */

import { cache } from "react"
import { listUsers, getUserColumnOptions, type UserDetail } from "./queries"
import { mapUserRecord } from "./helpers"
import { prisma } from "@/lib/database"

/**
 * Cache function: List users with pagination
 * 
 * Sử dụng cache() để tự động deduplicate requests và cache kết quả
 */
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

/**
 * Cache function: Get user detail by ID
 * 
 * Sử dụng cache() để tự động deduplicate requests và cache kết quả
 * 
 * @param id - User ID
 * @returns User detail hoặc null nếu không tìm thấy
 */
export const getUserDetailById = cache(async (id: string): Promise<UserDetail | null> => {
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

  // Map user record to UserDetail format
  return {
    ...mapUserRecord(user),
    bio: user.bio,
    phone: user.phone,
    address: user.address,
    emailVerified: user.emailVerified,
    updatedAt: user.updatedAt,
  }
})

/**
 * Cache function: Get all active roles
 * 
 * Sử dụng cache() để tự động deduplicate requests và cache kết quả
 * Dùng cho form options, filters, etc.
 * 
 * @returns Array of active roles
 */
export const getRolesCached = cache(async () => {
  const roles = await prisma.role.findMany({
    where: {
      isActive: true,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      displayName: true,
    },
    orderBy: {
      displayName: "asc",
    },
  })

  return roles
})

/**
 * Cache function: Get user column options for filters
 */
export const getUserColumnOptionsCached = cache(
  async (
    column: string,
    search?: string,
    limit: number = 50
  ): Promise<Array<{ label: string; value: string }>> => {
    return getUserColumnOptions(column, search, limit)
  }
)

