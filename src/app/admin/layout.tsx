import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { ScrollArea } from "@/components/ui/scroll-area"

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
      <AppSidebar />
      <SidebarInset className="flex flex-col">
          {children}
      </SidebarInset>
    </SidebarProvider>
  )
}

