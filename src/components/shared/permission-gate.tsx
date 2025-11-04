/**
 * PermissionGate Component
 * 
 * Server Component để check permission ở layout level
 * Sử dụng để kiểm tra quyền truy cập dựa trên route path mà không cần check từng page
 * 
 * Theo Next.js 16 best practices:
 * - Server Component để check permission ở server-side
 * - Hiển thị ForbiddenNotice nếu không có quyền
 * - Render children nếu có quyền
 */

import { getPermissions, getSession } from "@/lib/auth/auth-server"
import { PermissionGateClient } from "./permission-gate-client"

interface SessionWithMeta {
  roles?: Array<{ name: string }>
  permissions?: Array<string>
}

/**
 * PermissionGate Component (Server Component)
 * 
 * Check permission dựa trên current route pathname
 * Nếu user không có quyền, hiển thị ForbiddenNotice
 * Nếu có quyền, render children
 * 
 * Sử dụng Client Component wrapper để lấy pathname từ usePathname()
 */
export async function PermissionGate({
  children,
}: {
  children: React.ReactNode
}) {
  // Lấy session và permissions ở server-side
  const session = (await getSession()) as SessionWithMeta | null
  const permissions = await getPermissions()
  const roles = session?.roles ?? []

  // Pass session data xuống Client Component để check permission với pathname
  return (
    <PermissionGateClient
      permissions={permissions}
      roles={roles}
    >
      {children}
    </PermissionGateClient>
  )
}

