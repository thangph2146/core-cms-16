/**
 * Cache Functions for Users
 * 
 * Sử dụng unstable_cache (Data Cache) kết hợp với React cache (Request Memoization)
 * - unstable_cache: Cache kết quả giữa các requests (Persisted Cache)
 * - React cache: Deduplicate requests trong cùng một render pass
 * 
 * Pattern: Server Component → Cache Function → Database Query
 */

import { cache } from "react"
import { unstable_cache } from "next/cache"
import { listUsers, getUserColumnOptions, type UserDetail, type ListUsersInput, type ListUsersResult } from "./queries"
import { mapUserRecord } from "./helpers"
import { prisma } from "@/lib/database"

/**
 * Cache function: List users with pagination
 * Caching strategy: Cache by params string
 */
export const listUsersCached = cache(async (params: ListUsersInput = {}): Promise<ListUsersResult> => {
  const cacheKey = JSON.stringify(params)
  return unstable_cache(
    async () => listUsers(params),
    ['users-list', cacheKey],
    { 
      tags: ['users'], 
      revalidate: 3600 
    }
  )()
})

/**
 * Cache function: Get user detail by ID
 * Caching strategy: Cache by ID
 */
export const getUserDetailById = cache(async (id: string): Promise<UserDetail | null> => {
  return unstable_cache(
    async () => {
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
    },
    [`user-${id}`],
    { 
      tags: ['users', `user-${id}`],
      revalidate: 3600 
    }
  )()
})

/**
 * Cache function: Get all active roles
 * Caching strategy: Global active roles list
 */
export const getRolesCached = cache(async () => {
  return unstable_cache(
    async () => {
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
    },
    ['active-roles'],
    { 
      tags: ['roles', 'active-roles'],
      revalidate: 3600 
    }
  )()
})

/**
 * Cache function: Get user column options for filters
 * Caching strategy: Cache by column and search
 */
export const getUserColumnOptionsCached = cache(
  async (
    column: string,
    search?: string,
    limit: number = 50
  ): Promise<Array<{ label: string; value: string }>> => {
    const cacheKey = `${column}-${search || ''}-${limit}`
    return unstable_cache(
      async () => getUserColumnOptions(column, search, limit),
      [`user-options-${cacheKey}`],
      { 
        tags: ['users', 'user-options'],
        revalidate: 3600 
      }
    )()
  }
)

/**
 * Cache function: Get active users for select options
 * Caching strategy: Global active users list
 */
export const getActiveUsersForSelectCached = cache(
  async (limit: number = 100): Promise<Array<{ label: string; value: string }>> => {
    return unstable_cache(
      async () => {
        const users = await prisma.user.findMany({
          where: {
            isActive: true,
            deletedAt: null,
          },
          select: {
            id: true,
            name: true,
            email: true,
          },
          orderBy: {
            name: "asc",
          },
          take: limit,
        })

        return users.map((user) => ({
          label: user.name ? `${user.name} (${user.email})` : user.email || user.id,
          value: user.id,
        }))
      },
      [`active-users-select-${limit}`],
      { 
        tags: ['users', 'active-users'],
        revalidate: 3600 
      }
    )()
  }
)
