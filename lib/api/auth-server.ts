/**
 * Server-side auth utilities
 */
import { auth } from "@/lib/auth"
import type { Permission } from "@/lib/permissions"

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

export async function getPermissions(): Promise<Permission[]> {
  const session = await getSession()
  const sessionWithPerms = session as typeof session & {
    permissions?: Permission[]
  }
  return (sessionWithPerms?.permissions || []) as Permission[]
}
