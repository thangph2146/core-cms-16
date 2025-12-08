/**
 * Hook to use NextAuth session
 * Provides convenient access to user, permissions, and roles
 */
"use client"

import { useMemo } from "react"
import { useSession } from "next-auth/react"

export function useAuth() {
  const { data: session, status } = useSession()

  return useMemo(
    () => ({
      user: session?.user,
      permissions: session?.permissions ?? [],
      roles: session?.roles ?? [],
      isAuthenticated: !!session,
      isLoading: status === "loading",
    }),
    [session, status]
  )
}

