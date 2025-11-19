/**
 * Hook để check permissions của user với NextAuth
 */
"use client"

import { useCallback, useMemo } from "react"
import { useSession } from "next-auth/react"
import type { Permission } from "@/lib/permissions"
import { hasAnyPermission } from "@/lib/permissions"

export function usePermissions() {
  const { data: session, status } = useSession()

  const permissions = useMemo(
    () => (session?.permissions ?? []) as Permission[],
    [session?.permissions],
  )

  const hasPermission = useCallback(
    (permission: Permission) => permissions.includes(permission),
    [permissions],
  )

  const hasAny = useCallback(
    (requiredPermissions: Permission[]) =>
      hasAnyPermission(permissions, requiredPermissions),
    [permissions],
  )

  return useMemo(
    () => ({
      permissions,
      isLoading: status === "loading",
      error: null,
      hasPermission,
      hasAnyPermission: hasAny,
    }),
    [permissions, status, hasPermission, hasAny],
  )
}

