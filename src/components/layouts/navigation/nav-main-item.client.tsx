"use client"

import { ChevronRight } from "lucide-react"
import Link from "next/link"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { useClientOnly } from "@/hooks/use-client-only"
import * as React from "react"

export interface NavMainItemProps {
  title: string
  url: string
  icon: React.ReactElement
  isActive?: boolean
  items?: {
    title: string
    url: string
  }[]
  badgeCount?: number
}

export function NavMainItem({
  title,
  url,
  icon,
  isActive = false,
  items,
  badgeCount = 0,
}: NavMainItemProps) {
  // Chỉ render Collapsible sau khi component đã mount trên client để tránh hydration mismatch
  // Radix UI generate ID random khác nhau giữa server và client
  const isMounted = useClientOnly()

  // Clone icon element để đảm bảo tính hợp lệ khi truyền từ server component
  // Giữ nguyên tất cả props gốc để đảm bảo icon hoạt động đúng
  const iconElement = React.isValidElement(icon) 
    ? React.cloneElement(icon, { ...(icon.props as React.PropsWithChildren<React.SVGProps<SVGSVGElement>>) })
    : null

  if (!iconElement) {
    console.warn(`Icon is not a valid React element for "${title}"`)
    return null
  }

  const showBadge = badgeCount > 0 && isMounted // Chỉ hiển thị badge sau khi mount trên client

  // Render placeholder trên server để tránh hydration mismatch
  if (!isMounted) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip={title} isActive={isActive}>
          <Link href={url} className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 flex-1 min-w-0" suppressHydrationWarning>
              {iconElement}
              <span>{title}</span>
            </div>
            {/* Không render badge trên server để tránh hydration mismatch */}
          </Link>
        </SidebarMenuButton>
        {items?.length && isActive ? (
          <SidebarMenuSub>
            {items.map((subItem) => (
              <SidebarMenuSubItem key={subItem.url}>
                <SidebarMenuSubButton asChild>
                  <Link href={subItem.url}>
                    <span>{subItem.title}</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        ) : null}
      </SidebarMenuItem>
    )
  }

  return (
    <Collapsible asChild defaultOpen={isActive}>
      <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip={title} isActive={isActive}>
          <Link href={url} className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 flex-1 min-w-0" suppressHydrationWarning>
              {iconElement}
              <span>{title}</span>
            </div>
            {showBadge && (
              <Badge 
                variant="destructive" 
                className="ml-auto shrink-0"
                suppressHydrationWarning
              >
                {badgeCount > 99 ? "99+" : badgeCount}
              </Badge>
            )}
          </Link>
        </SidebarMenuButton>
        {items?.length ? (
          <>
            <CollapsibleTrigger asChild>
              <SidebarMenuAction className="data-[state=open]:rotate-90">
                <ChevronRight />
                <span className="sr-only">Toggle</span>
              </SidebarMenuAction>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                {items.map((subItem) => (
                  <SidebarMenuSubItem key={subItem.url}>
                    <SidebarMenuSubButton asChild>
                      <Link href={subItem.url}>
                        <span>{subItem.title}</span>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                ))}
              </SidebarMenuSub>
            </CollapsibleContent>
          </>
        ) : null}
      </SidebarMenuItem>
    </Collapsible>
  )
}

