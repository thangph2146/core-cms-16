/**
 * Hook để sử dụng NextAuth session
 */
"use client"

import { useSession } from "next-auth/react"

export function useAuth() {
  const { data: session, status } = useSession()

  return {
    user: session?.user,
    permissions: (session as any)?.permissions || [],
    roles: (session as any)?.roles || [],
    isAuthenticated: !!session,
    isLoading: status === "loading",
  }
}

