/**
 * PermissionGateClient Component
 * 
 * Client Component wrapper để lấy pathname và check permission
 * Sử dụng usePathname() để lấy current route pathname
 * 
 * Fix hydration mismatch: Sử dụng useClientOnly() để đợi component mount trên client
 * trước khi check permission và render, tránh mismatch giữa server và client render
 */

"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { getRoutePermissions, canPerformAnyAction } from "@/lib/permissions"
import type { Permission } from "@/lib/permissions"
import { ForbiddenNotice } from "./forbidden-notice"
import { useClientOnly } from "@/hooks/use-client-only"
import { logger } from "@/lib/config/logger"
import { useSession } from "@/lib/auth"

interface PermissionGateClientProps {
  children: React.ReactNode
  permissions: Permission[]
  roles: Array<{ name: string }>
}

const ADMIN_PREFIX = "/admin"
const AUTH_PREFIX = "/auth"

/**
 * Generate breadcrumbs từ pathname
 */
function generateBreadcrumbs(pathname: string) {
  const pathSegments = pathname.split("/").filter(Boolean)
  return pathSegments.map((segment, index) => {
    const href = "/" + pathSegments.slice(0, index + 1).join("/")
    const label = segment
      .split("-")
      .map((word) => {
        if (word === "id") return "Chi tiết"
        if (word === "new") return "Tạo mới"
        if (word === "edit") return "Chỉnh sửa"
        return word.charAt(0).toUpperCase() + word.slice(1)
      })
      .join(" ")
    
    return {
      label,
      href: index < pathSegments.length - 1 ? href : undefined,
      isActive: index === pathSegments.length - 1,
    }
  })
}

/**
 * PermissionGateClient Component
 * 
 * Client Component để check permission với pathname từ usePathname()
 */
export function PermissionGateClient({
  children,
  permissions,
  roles,
}: PermissionGateClientProps) {
  const pathname = usePathname()
  const mounted = useClientOnly()
  const { data: session, status } = useSession()
  const prevPathnameRef = useRef<string | null>(null)

  // Log khi pathname thay đổi
  useEffect(() => {
    if (mounted && pathname && pathname !== prevPathnameRef.current) {
      logger.debug("PermissionGateClient mounted", { pathname, session, status })
      prevPathnameRef.current = pathname
    }
  }, [mounted, pathname, session, status])

  // Early return nếu không có pathname
  if (!pathname) {
    return null
  }

  const isAdminRoute = pathname.startsWith(ADMIN_PREFIX)
  const isAuthRoute = pathname.startsWith(AUTH_PREFIX)
  const isUnauthenticated = status === "unauthenticated"
  const isLoading = status === "loading"
  const isAuthenticated = status === "authenticated"

  // Không render children khi loading hoặc chưa mount cho admin routes
  if ((isLoading || !mounted) && isAdminRoute) {
    return null
  }

  // Cho phép public routes khi chưa mount
  if (!mounted) {
    return <>{children}</>
  }

  // Block admin routes khi chưa đăng nhập
  if (isUnauthenticated && isAdminRoute) {
    return <ForbiddenNotice breadcrumbs={generateBreadcrumbs(pathname)} />
  }

  // Block auth routes khi đã đăng nhập
  if (isAuthenticated && isAuthRoute) {
    return (
      <ForbiddenNotice
        title="Đã đăng nhập"
        message="Bạn đã đăng nhập. Vui lòng quay lại trang quản trị."
      />
    )
  }

  // Check route permissions
  const requiredPermissions = getRoutePermissions(pathname)
  if (requiredPermissions.length === 0) {
    return <>{children}</>
  }

  // Check permission
  const hasPermission = canPerformAnyAction(permissions, roles, requiredPermissions)
  if (!hasPermission) {
    return <ForbiddenNotice breadcrumbs={generateBreadcrumbs(pathname)} />
  }

  return <>{children}</>
}

