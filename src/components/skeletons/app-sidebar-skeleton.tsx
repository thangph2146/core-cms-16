"use client"

import { Skeleton } from "@/components/ui/skeleton"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { NavMainSkeleton } from "./nav-main-skeleton"

/**
 * AppSidebarSkeleton Component
 * 
 * Skeleton loading state cho phần content của AppSidebar
 * Hiển thị cấu trúc menu giống với sidebar thật
 */
export function AppSidebarSkeleton() {
  return (
    <>
      {/* NavMain Skeleton */}
      <NavMainSkeleton />

      {/* NavProjects Skeleton */}
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel>
          <Skeleton className="h-4 w-16" />
        </SidebarGroupLabel>
        <SidebarMenu>
          {Array.from({ length: 1 }).map((_, index) => (
            <SidebarMenuItem key={index}>
              <SidebarMenuButton>
                <Skeleton className="size-4 rounded-sm" />
                <Skeleton className="h-4 w-20" />
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroup>

      {/* NavSecondary Skeleton */}
      <SidebarGroup className="mt-auto">
        <SidebarGroupContent>
          <SidebarMenu>
            {Array.from({ length: 2 }).map((_, index) => (
              <SidebarMenuItem key={index}>
                <SidebarMenuButton size="sm">
                  <Skeleton className="size-4 rounded-sm" />
                  <Skeleton className="h-4 w-20" />
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </>
  )
}

