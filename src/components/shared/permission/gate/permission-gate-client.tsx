/**
 * PermissionGateClient Component
 * 
 * Client Component để check permission với pathname từ usePathname()
 * Luôn hiển thị loading state trước khi kiểm tra xong
 */

"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  DEFAULT_RESOURCE_SEGMENT,
  getRoutePermissions,
  canPerformAnyAction,
  getResourceSegmentForRoles,
  toCanonicalResourcePath,
  applyResourceSegmentToPath,
} from "@/lib/permissions"
import type { Permission } from "@/lib/permissions"
import { ForbiddenNotice, UnauthenticatedNotice } from "@/components/shared"
import { AlreadyAuthenticatedNotice } from "../already-authenticated-notice"
import { useClientOnly } from "@/hooks/use-client-only"
import { useSession } from "@/lib/auth"

interface PermissionGateClientProps {
  children: React.ReactNode
  permissions: Permission[]
  roles: Array<{ name: string }>
}

export function PermissionGateClient({ children, permissions, roles }: PermissionGateClientProps) {
  const pathname = usePathname()
  const router = useRouter()
  const mounted = useClientOnly()
  const { status } = useSession()
  const [isChecking, setIsChecking] = useState(true)
  const resourceSegment = getResourceSegmentForRoles(roles)

  // Combined useEffect for checking state
  useEffect(() => {
    // Reset checking state asynchronously to avoid synchronous setState
    const startTimer = setTimeout(() => {
      setIsChecking(true)
    }, 0)

    const finishTimer = setTimeout(() => {
      setIsChecking(false)
    }, 100)

    return () => {
      clearTimeout(startTimer)
      clearTimeout(finishTimer)
    }
  }, [pathname, status, mounted])

  // Loading states
  const canonicalPathname = pathname
    ? toCanonicalResourcePath(pathname, resourceSegment)
    : pathname

  const expectedPathname =
    pathname &&
    status === "authenticated" &&
    resourceSegment !== DEFAULT_RESOURCE_SEGMENT &&
    pathname.startsWith(`/${DEFAULT_RESOURCE_SEGMENT}`)
      ? applyResourceSegmentToPath(pathname, resourceSegment)
      : null

  useEffect(() => {
    if (
      expectedPathname &&
      pathname &&
      expectedPathname !== pathname
    ) {
      router.replace(expectedPathname)
    }
  }, [expectedPathname, pathname, router])

  const isProtectedRoute =
    !!canonicalPathname?.startsWith(`/${DEFAULT_RESOURCE_SEGMENT}`) ||
    pathname?.startsWith(`/${resourceSegment}`)

  if (
    !pathname ||
    isChecking ||
    status === "loading" ||
    (expectedPathname && expectedPathname !== pathname) ||
    (!mounted && isProtectedRoute)
  ) {
    return null
  }

  const isAdminRoute = isProtectedRoute
  const isAuthRoute = pathname.startsWith("/auth")

  // Show unauthenticated notice instead of redirecting
  if (status === "unauthenticated" && isAdminRoute) {
    const callbackUrl = encodeURIComponent(pathname)
    return (
      <UnauthenticatedNotice
        onLogin={() => {
          router.push(`/auth/sign-in?callbackUrl=${callbackUrl}`)
        }}
      />
    )
  }

  // Block auth routes when authenticated
  if (status === "authenticated" && isAuthRoute) {
    return <AlreadyAuthenticatedNotice />
  }

  // Permission checks (only for authenticated users)
  if (status === "authenticated") {
    const requiredPermissions = canonicalPathname
      ? getRoutePermissions(canonicalPathname)
      : []
    if (requiredPermissions.length > 0 && !canPerformAnyAction(permissions, roles, requiredPermissions)) {
      return <ForbiddenNotice />
    }
  }

  return <>{children}</>
}

