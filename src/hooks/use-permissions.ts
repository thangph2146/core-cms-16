/**
 * Hook to check user permissions with NextAuth
 * Follows React best practices for memoization and logging
 */
"use client"

import { useCallback, useEffect, useMemo } from "react"
import { useSession } from "next-auth/react"
import type { Permission } from "@/lib/permissions"
import { hasAnyPermission } from "@/lib/permissions"
import { logger } from "@/lib/config"

// Module-level cache to ensure single log per user/permissions change
const loggedPermissionsCache = new Map<string, string>()

export function usePermissions() {
  const { data: session, status } = useSession()

  // Deduplicate and sort permissions
  const permissions = useMemo(() => {
    const perms = (session?.permissions ?? []) as Permission[]
    return Array.from(new Set(perms)).sort()
  }, [session?.permissions])

  // Log permissions on session load or change
  useEffect(() => {
    if (status === "loading" || !session?.user) return

    const userId = session.user.id
    const permissionsKey = JSON.stringify(permissions)
    const lastLoggedKey = loggedPermissionsCache.get(userId)

    if (lastLoggedKey === permissionsKey) return

    loggedPermissionsCache.set(userId, permissionsKey)

    logger.info("[usePermissions] Loaded permissions from session", {
      action: "permissions_loaded",
      email: session.user.email,
      userId: session.user.id,
      roles: session.roles?.map((r) => r.name) ?? [],
      permissionsCount: permissions.length,
      permissions,
    })
  }, [session, status, permissions])

  const hasPermission = useCallback(
    (permission: Permission) => permissions.includes(permission),
    [permissions]
  )

  const hasAny = useCallback(
    (requiredPermissions: Permission[]) =>
      hasAnyPermission(permissions, requiredPermissions),
    [permissions]
  )

  return useMemo(
    () => ({
      permissions,
      isLoading: status === "loading",
      error: null,
      hasPermission,
      hasAnyPermission: hasAny,
    }),
    [permissions, status, hasPermission, hasAny]
  )
}

