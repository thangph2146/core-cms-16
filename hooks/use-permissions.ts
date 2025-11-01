/**
 * Hook để check permissions của user với NextAuth
 */
"use client"

import { useSession } from "next-auth/react"
import type { Permission } from "@/lib/permissions"
import { hasAnyPermission } from "@/lib/permissions"

export function usePermissions() {
  const { data: session, status } = useSession()
  const permissions = (session?.permissions || []) as Permission[]

  return {
    permissions,
    isLoading: status === "loading",
    error: null,
    hasPermission: (permission: Permission) => {
      return permissions.includes(permission)
    },
    hasAnyPermission: (requiredPermissions: Permission[]) => {
      return hasAnyPermission(permissions, requiredPermissions)
    },
  }
}

