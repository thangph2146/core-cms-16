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
import { NotificationBell } from "@/components/notifications"
import { ModeToggle } from "@/components/shared"
import { useResourceSegment } from "@/hooks/use-resource-segment"
import { applyResourceSegmentToPath } from "@/lib/permissions"

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
  const resourceSegment = useResourceSegment()
  const dashboardHref = applyResourceSegmentToPath("/admin/dashboard", resourceSegment)

  return (
    <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex flex-1 items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href={dashboardHref}>
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
                      <BreadcrumbLink href={resolvedHref}>
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

