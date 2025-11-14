/**
 * Server-side auth utilities
 */
import { auth } from "./auth"
import type { Permission } from "@/lib/permissions"
import { prisma } from "@/lib/database"

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

  try {
    // Always fetch from database to ensure permissions are up-to-date
    // This is especially important after seed or role permission updates
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
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
    
    // Log for debugging (only in development)
    if (process.env.NODE_ENV === "development") {
      console.log("[getPermissions] Loaded permissions from database", {
        email: session.user.email,
        userId: user.id,
        roles: user.userRoles.map((ur) => ur.role.name),
        permissionsCount: permissions.length,
        permissions: permissions.slice(0, 10), // Log first 10 for debugging
      })
    }
    
    return permissions as Permission[]
  } catch (error) {
    console.error("[getPermissions] Error loading permissions from database", {
      email: session.user.email,
      error: error instanceof Error ? error.message : String(error),
    })
    // Fallback to session permissions if database query fails
    const sessionWithPerms = session as typeof session & {
      permissions?: Permission[]
    }
    return (sessionWithPerms?.permissions || []) as Permission[]
  }
}
