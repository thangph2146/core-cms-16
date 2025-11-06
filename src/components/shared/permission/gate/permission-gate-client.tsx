/**
 * PermissionGateClient Component
 * 
 * Client Component để check permission với pathname từ usePathname()
 * Luôn hiển thị loading state trước khi kiểm tra xong
 */

"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { getRoutePermissions, canPerformAnyAction } from "@/lib/permissions"
import type { Permission } from "@/lib/permissions"
import { ForbiddenNotice } from "../../forbidden-notice"
import { useClientOnly } from "@/hooks/use-client-only"
import { useSession } from "@/lib/auth"
import { LoadingFallback } from "@/components/providers/loading-fallback"

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

  // Combined useEffect for checking state and redirect
  useEffect(() => {
    // Reset checking state asynchronously to avoid synchronous setState
    const startTimer = setTimeout(() => {
      setIsChecking(true)
    }, 0)

    const finishTimer = setTimeout(() => {
      setIsChecking(false)
    }, 100)

    // Redirect unauthenticated users to sign-in
    if (mounted && pathname && status === "unauthenticated" && pathname.startsWith("/admin") && !pathname.startsWith("/auth")) {
      const callbackUrl = encodeURIComponent(pathname)
      router.push(`/auth/sign-in?callbackUrl=${callbackUrl}`)
    }

    return () => {
      clearTimeout(startTimer)
      clearTimeout(finishTimer)
    }
  }, [pathname, status, mounted, router])

  // Loading states
  if (!pathname || isChecking || status === "loading" || (!mounted && pathname?.startsWith("/admin"))) {
    return <LoadingFallback />
  }

  const isAdminRoute = pathname.startsWith("/admin")
  const isAuthRoute = pathname.startsWith("/auth")

  // Still show loading while redirecting
  if (status === "unauthenticated" && isAdminRoute) {
    return <LoadingFallback />
  }

  // Block auth routes when authenticated
  if (status === "authenticated" && isAuthRoute) {
    return <ForbiddenNotice title="Đã đăng nhập" message="Bạn đã đăng nhập. Vui lòng quay lại trang quản trị." />
  }

  // Permission checks (only for authenticated users)
  if (status === "authenticated") {
    const requiredPermissions = getRoutePermissions(pathname)
    if (requiredPermissions.length > 0 && !canPerformAnyAction(permissions, roles, requiredPermissions)) {
      return <ForbiddenNotice />
    }
  }

  return <>{children}</>
}

