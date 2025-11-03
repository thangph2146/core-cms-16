import { Suspense } from "react"
import { AppSidebar, NavMain } from "@/components/navigation"
import { NavMainSkeleton } from "@/components/skeletons"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

/**
 * Admin Layout
 * 
 * Cấu trúc:
 * - SidebarProvider: Quản lý sidebar state
 * - AppSidebar: Sidebar navigation
 * - SidebarInset: Main content area
 * - ScrollArea: Wrapper cho scrollable content, đảm bảo AdminHeader sticky hoạt động
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <AppSidebar
        navMainSlot={
          <Suspense fallback={<NavMainSkeleton />}>
            <NavMain />
          </Suspense>
        }
      />
      <SidebarInset className="flex flex-col">
          {children}
      </SidebarInset>
    </SidebarProvider>
  )
}

