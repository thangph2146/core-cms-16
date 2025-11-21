/**
 * Admin Header Component - Header chung cho tất cả admin pages
 */
"use client"

import * as React from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { NotificationBell } from "@/components/layouts/notifications"
import { ModeToggle } from "@/components/layouts/shared"
import { useResourceSegment } from "@/hooks/use-resource-segment"
import { applyResourceSegmentToPath } from "@/lib/permissions"
import { queryKeys } from "@/lib/query-keys"

export interface AdminBreadcrumbItem {
  label: string
  href?: string
  isActive?: boolean
}

interface AdminHeaderProps {
  breadcrumbs?: AdminBreadcrumbItem[]
}

export function AdminHeader({ breadcrumbs = [] }: AdminHeaderProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const queryClient = useQueryClient()
  const resourceSegment = useResourceSegment()
  const dashboardHref = applyResourceSegmentToPath("/admin/dashboard", resourceSegment)
  
  // Handle breadcrumb navigation với cache invalidation
  const handleBreadcrumbClick = React.useCallback(async (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault()
    
    // Invalidate React Query cache cho các resources phổ biến
    // Điều này đảm bảo khi quay lại list page, data được refetch
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.adminTags.all(), refetchType: "all" }),
      queryClient.invalidateQueries({ queryKey: queryKeys.adminPosts.all(), refetchType: "all" }),
      queryClient.invalidateQueries({ queryKey: queryKeys.adminCategories.all(), refetchType: "all" }),
    ]).catch((error) => {
      // Log error nhưng không block navigation
      console.error("Error invalidating queries:", error)
    })
    
    // Refresh router TRƯỚC để invalidate Router Cache cho current route
    router.refresh()
    // Thêm delay nhỏ để đảm bảo refresh hoàn thành
    await new Promise((resolve) => setTimeout(resolve, 100))
    // Navigate với cache-busting parameter để force Server Component refetch
    const url = new URL(href, window.location.origin)
    url.searchParams.set("_t", Date.now().toString())
    await router.push(url.pathname + url.search)
    // Refresh router SAU KHI navigate để invalidate Router Cache cho route mới
    await new Promise((resolve) => setTimeout(resolve, 100))
    router.refresh()
  }, [router, queryClient])

  return (
    <header
      data-admin-header="true"
      className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    >
      <div className="flex flex-1 items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink 
                href={dashboardHref}
                onClick={(e) => handleBreadcrumbClick(e, dashboardHref)}
              >
                Trang quản trị
              </BreadcrumbLink>
            </BreadcrumbItem>
            {breadcrumbs.length > 0 && (
              <BreadcrumbSeparator className="hidden md:block" />
            )}
            {breadcrumbs.map((item, index) => {
              const isLast = index === breadcrumbs.length - 1
              const resolvedHref = item.href
                ? applyResourceSegmentToPath(item.href, resourceSegment)
                : undefined
              return (
                <React.Fragment key={index}>
                  {index > 0 && (
                    <BreadcrumbSeparator className="hidden md:block" />
                  )}
                  <BreadcrumbItem className={item.isActive ? "" : "hidden md:block"}>
                    {isLast || !resolvedHref ? (
                      <BreadcrumbPage>{item.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink 
                        href={resolvedHref}
                        onClick={(e) => handleBreadcrumbClick(e, resolvedHref)}
                      >
                        {item.label}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </React.Fragment>
              )
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      {session?.user?.id && (
        <div className="flex items-center gap-2 px-4">
          <ModeToggle />
          <NotificationBell />
        </div>
      )}
    </header>
  )
}

