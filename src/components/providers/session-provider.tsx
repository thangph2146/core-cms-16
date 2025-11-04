/**
 * Session Provider (NextAuth.js)
 * 
 * Theo Next.js 16 và NextAuth best practices:
 * - Cung cấp authentication state cho toàn bộ app
 * - Xử lý permission-based routing ở client-side
 * - Proxy (Edge Runtime) chỉ làm quick redirects dựa trên cookie `authjs.session-token` existence
 * - Layouts (Server Components) fetch session nhưng KHÔNG redirect (Partial Rendering)
 * - PermissionRouter (Client Component) xử lý validation và redirects chi tiết
 * 
 * Flow xử lý session và redirect (theo Next.js 16 docs):
 * 1. Proxy (Edge Runtime) -> Optimistic checks: 
 *    - Kiểm tra cookie `authjs.session-token` existence
 *    - Decrypt session để verify
 *    - Quick redirects nếu cần (chưa đăng nhập -> sign-in, đã đăng nhập -> dashboard)
 * 
 * 2. Layouts (Server Components) -> Fetch session với getSession():
 *    - KHÔNG redirect (tuân thủ Partial Rendering)
 *    - Chỉ fetch data và pass xuống children
 * 
 * 3. PermissionRouter (Client Component) -> Validate session và permissions:
 *    - Validate session với useSession() từ NextAuth
 *    - Check permissions chi tiết
 *    - Redirect nếu không có quyền truy cập
 */
"use client"

import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { SessionProvider as NextAuthSessionProvider } from "next-auth/react"
import type { SessionProviderProps } from "next-auth/react"
import { MENU_PERMISSIONS } from "@/lib/permissions"
import type { Permission } from "@/lib/permissions"
import { canPerformAnyAction } from "@/lib/permissions"
import { getMenuData } from "@/lib/config/menu-data"
import { logger } from "@/lib/config/logger"
import { LoadingFallback } from "./loading-fallback"

const ROOT_PATH = "/"
const AUTH_PREFIX = "/auth"
const ADMIN_PREFIX = "/admin"
const DASHBOARD_PATH = "/admin/dashboard"
const PENDING_STORAGE_KEY = "pendingPath"

const isPublicPath = (path: string) =>
  path === ROOT_PATH || path.startsWith(AUTH_PREFIX)

/**
 * PermissionRouter Component
 * 
 * Xử lý permission-based routing ở client-side (sau khi Proxy đã làm optimistic checks)
 * 
 * Theo Next.js 16 và NextAuth best practices:
 * - Proxy (Edge Runtime) đã làm quick redirects dựa trên cookie `authjs.session-token`
 * - Layouts (Server Components) đã fetch session nhưng không redirect
 * - PermissionRouter (Client Component) xử lý validation và redirects chi tiết ở client-side
 * 
 * Chức năng:
 * - Validate session với useSession() từ NextAuth (client-side)
 * - Check permissions chi tiết cho từng route
 * - Redirect nếu không có quyền truy cập
 * - Redirect về sign-in nếu chưa đăng nhập (fallback nếu Proxy miss)
 * - Redirect về dashboard nếu đã đăng nhập nhưng truy cập auth pages
 */
function PermissionRouter({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Track pathname trước khi redirect để hiển thị loading cho đến khi pathname thay đổi
  // Và để redirect về page đó sau khi đăng nhập
  // Khôi phục từ sessionStorage khi mount (lazy initialization)
  const [pendingPath, setPendingPath] = useState<string | null>(() => {
    if (typeof window === "undefined") return null
    return sessionStorage.getItem(PENDING_STORAGE_KEY)
  })
  const prevStateRef = useRef<{ pathname: string; status: string; hasSession: boolean } | null>(null)

  // Đồng bộ pending path vào sessionStorage
  useEffect(() => {
    if (typeof window === "undefined") return
    if (pendingPath) {
      sessionStorage.setItem(PENDING_STORAGE_KEY, pendingPath)
    } else {
      sessionStorage.removeItem(PENDING_STORAGE_KEY)
    }
  }, [pendingPath])

  const callbackPath = useMemo(() => {
    const raw = searchParams.get("callbackUrl")
    if (!raw) return null

    try {
      const decoded = decodeURIComponent(raw)
      return decoded.startsWith("/") ? decoded : null
    } catch {
      logger.warn("Invalid callbackUrl detected", { raw })
      return null
    }
  }, [searchParams])


  useEffect(() => {
    // Early return nếu đang loading session
    if (status === "loading") {
      return
    }

    const hasSession = Boolean(session?.user)
    const isAuthenticated = status === "authenticated" && hasSession
    const isCurrentPublic = isPublicPath(pathname)
    const isAdminRoute = pathname.startsWith(ADMIN_PREFIX)

    // Debug logging (chỉ trong development)
    if (process.env.NODE_ENV === "development") {
      const snapshot = { pathname, status, hasSession, isAuthenticated }
      const prevSnapshot = prevStateRef.current

      if (
        !prevSnapshot ||
        prevSnapshot.pathname !== snapshot.pathname ||
        prevSnapshot.status !== snapshot.status ||
        prevSnapshot.hasSession !== snapshot.hasSession
      ) {
        logger.info("PermissionRouter", {
          ...snapshot,
          isPublicRoute: isCurrentPublic,
          isAdminRoute,
        })
        prevStateRef.current = snapshot
      }
    }

    // Helper functions
    const savePendingPath = (target: string) => {
      if (!target || pendingPath === target) return
      setPendingPath(target)
    }

    const clearPendingPath = () => {
      if (pendingPath !== null) {
        setPendingPath(null)
      }
    }

    const redirectToSignIn = (targetPath: string = pathname) => {
      savePendingPath(targetPath)
      const signInUrl = `${AUTH_PREFIX}/sign-in?callbackUrl=${encodeURIComponent(targetPath)}`
      router.replace(signInUrl)
    }

    const redirectTo = (target: string) => {
      if (!target || target === pathname) return
      router.replace(target)
    }

    // BẢO VỆ ADMIN ROUTES: Chặn ngay lập tức nếu chưa đăng nhập
    // Đây là bảo vệ chính để ngăn truy cập admin khi chưa đăng nhập
    // Kể cả khi user nhập trực tiếp pathname như /admin/users
    // Theo Next.js 16 best practices: Client-side validation để đảm bảo security
    if (isAdminRoute) {
      if (!isAuthenticated) {
        redirectToSignIn()
        return
      }
      // Nếu đã đăng nhập, tiếp tục check permissions ở dưới
    }

    // BẢO VỆ CHUNG: Chưa đăng nhập và không phải public route
    if (!isAuthenticated) {
      if (isCurrentPublic) {
        clearPendingPath()
        return
      }
      // Fallback cho các routes không phải public và không phải admin (đã check ở trên)
      redirectToSignIn()
      return
    }

    // 2. Đã đăng nhập -> đảm bảo không ở trang auth (trừ ROOT_PATH)
    // Nếu đang ở trang auth, redirect về trang trước đó hoặc dashboard
    if (isCurrentPublic && pathname !== ROOT_PATH && pathname.startsWith(AUTH_PREFIX)) {
      const fallbackPath =
        pendingPath && pendingPath.startsWith("/") ? pendingPath : DASHBOARD_PATH
      const redirectTarget = callbackPath ?? fallbackPath

      clearPendingPath()
      redirectTo(redirectTarget)
      return
    }

    // 3. Đã đăng nhập ở route admin -> kiểm tra permissions
    if (isAdminRoute) {
      const sessionData = session as unknown as {
        permissions?: ReadonlyArray<Permission>
        roles?: ReadonlyArray<{ name: string }>
      }

      const userPermissions = [...(sessionData?.permissions ?? [])]
      const userRoles = [...(sessionData?.roles ?? [])]
      const menuData = getMenuData(userPermissions)

      const findRoutePermissions = (
        url: string
      ): ReadonlyArray<Permission> | undefined => {
        for (const item of menuData.navMain) {
          if (item.url === url) return item.permissions

          if (item.items) {
            for (const subItem of item.items) {
              if (subItem.url === url && subItem.permissions) {
                return subItem.permissions
              }
            }
          }

          if (url.startsWith(`${item.url}/`)) {
            return item.permissions
          }
        }

        const routePermissions: Record<string, ReadonlyArray<Permission>> = {
          "/admin/dashboard": MENU_PERMISSIONS.dashboard,
          "/admin/users": MENU_PERMISSIONS.users,
          "/admin/posts": MENU_PERMISSIONS.posts,
          "/admin/categories": MENU_PERMISSIONS.categories,
          "/admin/tags": MENU_PERMISSIONS.tags,
          "/admin/comments": MENU_PERMISSIONS.comments,
          "/admin/roles": MENU_PERMISSIONS.roles,
          "/admin/messages": MENU_PERMISSIONS.messages,
          "/admin/notifications": MENU_PERMISSIONS.notifications,
          "/admin/contact-requests": MENU_PERMISSIONS.contact_requests,
          "/admin/students": MENU_PERMISSIONS.students,
          "/admin/settings": MENU_PERMISSIONS.settings,
        }

        if (routePermissions[url]) return routePermissions[url]

        for (const [route, permissions] of Object.entries(routePermissions)) {
          if (url.startsWith(route)) return permissions
        }

        return undefined
      }

      const requiredPermissions = findRoutePermissions(pathname)

      if (requiredPermissions && requiredPermissions.length > 0) {
        const requiredPermissionsList = [...requiredPermissions]
        const hasAccess = canPerformAnyAction(
          userPermissions,
          userRoles,
          requiredPermissionsList
        )

        if (!hasAccess) {
          const hasDashboardAccess = canPerformAnyAction(
            userPermissions,
            userRoles,
            [...MENU_PERMISSIONS.dashboard]
          )

          const redirectTarget = hasDashboardAccess ? DASHBOARD_PATH : ROOT_PATH
          savePendingPath(pathname)
          redirectTo(redirectTarget)
          return
        }
      }
    }

    // 4. Mặc định: đã thoả điều kiện, clear pending path
    clearPendingPath()
  }, [callbackPath, pathname, pendingPath, router, session, status])

  // Loading state logic: Hiển thị loading để tránh flash content
  // Đặc biệt quan trọng cho admin routes để đảm bảo không render content khi chưa xác nhận session
  const hasSession = Boolean(session?.user)
  const isAuthPage = pathname.startsWith(AUTH_PREFIX) && pathname !== ROOT_PATH
  
  // Hiển thị loading khi:
  // 1. Đang kiểm tra session (status === "loading")
  // 2. Đang chờ redirect (pendingPath chưa được clear)
  // 3. Đã đăng nhập nhưng đang ở trang auth (chờ redirect về dashboard)
  const shouldRenderLoading =
    status === "loading" || // Đang kiểm tra session
    (pendingPath !== null && pathname === pendingPath) || // Đang chờ redirect hoàn tất
    (hasSession && isAuthPage && status === "authenticated") // Đã đăng nhập ở auth page (chờ redirect)

  if (shouldRenderLoading) {
    return <LoadingFallback />
  }
  
  // Render children sau khi đã kiểm tra session xong và pathname đã thay đổi
  return <>{children}</>
}

// Wrapper component để sử dụng useSearchParams trong Suspense
function PermissionRouterWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PermissionRouter>{children}</PermissionRouter>
    </Suspense>
  )
}

export function SessionProvider({
  children,
  ...props
}: SessionProviderProps) {
  return (
    <NextAuthSessionProvider
      {...props}
      // Tối ưu: giảm số lần refetch session
      refetchInterval={5 * 60} // Refetch mỗi 5 phút (thay vì mặc định 0 = không refetch)
      refetchOnWindowFocus={false} // Không refetch khi focus window
    >
      <PermissionRouterWrapper>{children}</PermissionRouterWrapper>
    </NextAuthSessionProvider>
  )
}

