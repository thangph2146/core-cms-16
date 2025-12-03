/**
 * Admin Header Component - Header chung cho tất cả admin pages
 */
"use client"

import * as React from "react"
import { useSession } from "next-auth/react"
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
import { useResourceRouter, useResourceSegment } from "@/hooks/use-resource-segment"
import { applyResourceSegmentToPath } from "@/lib/permissions"
import { truncateBreadcrumbLabel } from "@/features/admin/resources/utils"
import { logger } from "@/lib/config/logger"

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
  const router = useResourceRouter()
  const resourceSegment = useResourceSegment()
  const dashboardHref = applyResourceSegmentToPath("/admin/dashboard", resourceSegment)
  
  // Handle breadcrumb navigation với cache invalidation
  // Sử dụng cache-busting parameter và router.refresh() để đảm bảo data mới nhất
  const handleBreadcrumbClick = React.useCallback((e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault()
    const startTime = performance.now()
    
    logger.info("🍞 Breadcrumb navigation", {
      source: "breadcrumb",
      href,
      resourceSegment,
      currentPath: window.location.pathname,
    })
    
    // Navigate với cache-busting parameter để force Server Component refetch
    const url = new URL(href, window.location.origin)
    url.searchParams.set("_t", Date.now().toString())
    const targetUrl = url.pathname + url.search
    
    logger.debug("➡️ Đang navigate từ breadcrumb", {
      originalHref: href,
      targetUrl,
    })
    
    router.replace(targetUrl)
    
    // Refresh router để đảm bảo Server Components được re-render với data mới
    // Next.js sẽ tự động revalidate khi navigate
    router.refresh()
    
    const duration = performance.now() - startTime
    logger.success("✅ Breadcrumb navigation hoàn tất", {
      duration: `${duration.toFixed(2)}ms`,
      targetUrl,
    })
  }, [router, resourceSegment])

  return (
    <header
      data-admin-header="true"
      className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background"
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
              // Truncate label nếu quá dài để tránh breadcrumb quá dài
              const truncatedLabel = truncateBreadcrumbLabel(item.label)
              return (
                <React.Fragment key={index}>
                  {index > 0 && (
                    <BreadcrumbSeparator className="hidden md:block" />
                  )}
                  <BreadcrumbItem className={item.isActive ? "" : "hidden md:block"}>
                    {isLast || !resolvedHref ? (
                      <BreadcrumbPage title={item.label}>{truncatedLabel}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink 
                        href={resolvedHref}
                        onClick={(e) => handleBreadcrumbClick(e, resolvedHref)}
                        title={item.label}
                      >
                        {truncatedLabel}
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

