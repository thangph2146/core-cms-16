import { Suspense } from "react"
import { getSession } from "@/lib/auth/auth-server"
import { getMenuData } from "@/lib/config"
import { AppSidebar, NavMain } from "@/components/navigation"
import { NavMainSkeleton } from "@/components/skeletons"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { PermissionGate } from "@/components/shared"
import type { Permission } from "@/lib/permissions"

/**
 * Admin Layout với Suspense tối ưu
 * 
 * Theo Next.js 16 best practices và NextAuth docs:
 * - Layouts KHÔNG nên làm auth checks và redirects (vì Partial Rendering)
 * - Layouts chỉ fetch user data và pass xuống children components
 * - Auth redirects được xử lý bởi Proxy (proxy.ts) sớm trong request pipeline
 * - Permission checking được xử lý bởi PermissionGate ở layout level
 * 
 * Theo Next.js 16 docs về Partial Rendering và Streaming:
 * - Layouts được render một cách độc lập, có thể cache và revalidate riêng
 * - Redirects trong layouts có thể gây ra issues với Partial Rendering
 * - Sử dụng Suspense để tách session fetching và menu generation
 * - Sidebar có thể render ngay, menu stream khi ready
 * 
 * Cấu trúc:
 * - SidebarProvider: Quản lý sidebar state
 * - AppSidebar: Sidebar navigation (nhận session data)
 * - SidebarInset: Main content area
 * - PermissionGate: Check permission dựa trên route path, hiển thị ForbiddenNotice nếu không có quyền
 */
async function NavMainWithMenu() {
  const session = await getSession()
  
  // Fetch menu data dựa trên permissions
  const menuData = session?.permissions && session.permissions.length > 0
    ? getMenuData(session.permissions as Permission[])
    : { navMain: [] }
  const navMainItems = menuData.navMain

  return <NavMain items={navMainItems} />
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Session được fetch trong NavMainWithMenu để không block layout rendering
  // Layout structure render ngay, menu stream khi ready

  return (
    <SidebarProvider>
      <AppSidebar
        navMainSlot={
          <Suspense fallback={<NavMainSkeleton />}>
            <NavMainWithMenu />
          </Suspense>
        }
      />
      <SidebarInset className="flex flex-col w-full overflow-x-hidden">
        <PermissionGate>
          {children}
        </PermissionGate>
      </SidebarInset>
    </SidebarProvider>
  )
}

