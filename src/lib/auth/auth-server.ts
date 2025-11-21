/**
 * Server-side auth utilities
 */
import { auth } from "./auth"
import type { Permission } from "@/lib/permissions"
import { prisma } from "@/lib/database"
import { logger } from "@/lib/config"

// Cache để tránh duplicate logs trong cùng một request/process
const permissionLogCache = new Map<string, { timestamp: number }>()
const LOG_DEBOUNCE_MS = 5000 // Chỉ log một lần mỗi 5 giây cho cùng một user

// Cleanup cache định kỳ để tránh memory leak
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of permissionLogCache.entries()) {
    if (now - value.timestamp > LOG_DEBOUNCE_MS * 2) {
      permissionLogCache.delete(key)
    }
  }
}, LOG_DEBOUNCE_MS * 2)

export async function getSession() {
  return auth()
}

export async function requireAuth() {
  const session = await getSession()

  if (!session) {
    throw new Error("Unauthorized")
  }

  return session
}

/**
 * Get permissions from database to ensure they're always up-to-date
 * This is important after seed or role updates
 */
export async function getPermissions(): Promise<Permission[]> {
  const session = await getSession()
  
  if (!session?.user?.email) {
    return []
  }

  const userEmail = session.user.email
  const now = Date.now()

  try {
    // Always fetch from database to ensure permissions are up-to-date
    // This is especially important after seed or role permission updates
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    })

    if (!user || !user.isActive || user.deletedAt !== null) {
      return []
    }

    // Extract permissions from all user roles
    const permissions = user.userRoles.flatMap((ur) => ur.role.permissions)
    
    // Log for debugging (only in development) với debounce để tránh duplicate logs
    if (process.env.NODE_ENV === "development") {
      const cacheKey = `${userEmail}-${user.id}`
      const cached = permissionLogCache.get(cacheKey)
      
      // Chỉ log nếu chưa log trong LOG_DEBOUNCE_MS gần đây
      if (!cached || now - cached.timestamp > LOG_DEBOUNCE_MS) {
        logger.debug("[getPermissions] Loaded permissions from database", {
          email: userEmail,
          userId: user.id,
          roles: user.userRoles.map((ur) => ur.role.name),
          permissionsCount: permissions.length,
          permissions: permissions.slice(0, 10),
        })
        
        permissionLogCache.set(cacheKey, { timestamp: now })
      }
    }
    
    return permissions as Permission[]
  } catch (error) {
    logger.error("[getPermissions] Error loading permissions from database", {
      email: userEmail,
      error: error instanceof Error ? error.message : String(error),
    })
    // Fallback to session permissions if database query fails
    const sessionWithPerms = session as typeof session & {
      permissions?: Permission[]
    }
    return (sessionWithPerms?.permissions || []) as Permission[]
  }
}
