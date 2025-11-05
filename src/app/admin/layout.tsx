import { Suspense } from "react"
import { getSession } from "@/lib/auth/auth-server"
import { AppSidebar, NavMain } from "@/components/navigation"
import { NavMainSkeleton } from "@/components/skeletons"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { PermissionGate } from "@/components/shared"

/**
 * Admin Layout
 * 
 * Theo Next.js 16 best practices và NextAuth docs:
 * - Layouts KHÔNG nên làm auth checks và redirects (vì Partial Rendering)
 * - Layouts chỉ fetch user data và pass xuống children components
 * - Auth redirects được xử lý bởi Proxy (proxy.ts) sớm trong request pipeline
 * - Permission checking được xử lý bởi PermissionGate ở layout level
 * 
 * Theo Next.js 16 docs về Partial Rendering:
 * - Layouts được render một cách độc lập, có thể cache và revalidate riêng
 * - Redirects trong layouts có thể gây ra issues với Partial Rendering
 * - Nên fetch data và pass xuống children, không redirect
 * 
 * Cấu trúc:
 * - SidebarProvider: Quản lý sidebar state
 * - AppSidebar: Sidebar navigation (nhận session data)
 * - SidebarInset: Main content area
 * - PermissionGate: Check permission dựa trên route path, hiển thị ForbiddenNotice nếu không có quyền
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Chỉ fetch session data, KHÔNG check auth và redirect
  // Proxy (proxy.ts) đã xử lý redirects sớm trong request pipeline:
  // - Kiểm tra cookie `authjs.session-token` existence
  // - Decrypt session để verify
  // - Redirect về sign-in nếu chưa đăng nhập
  // 
  // Layout này chỉ cung cấp data cho children components
  // PermissionGate sẽ check permission dựa trên route path và hiển thị ForbiddenNotice nếu không có quyền
  await getSession()

  return (
    <SidebarProvider>
      <AppSidebar
        navMainSlot={
          <Suspense fallback={<NavMainSkeleton />}>
            <NavMain />
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

