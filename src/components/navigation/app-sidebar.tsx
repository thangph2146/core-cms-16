"use client"

import * as React from "react"
import { Command } from "lucide-react"
import { useSession } from "next-auth/react"
import { appConfig, getMenuData } from "@/lib/config"
import { NavProjects, NavSecondary, NavUser } from "./"
import { AppSidebarSkeleton } from "@/components/skeletons"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import type { Permission } from "@/lib/permissions"
import type { ReactNode } from "react"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  navMainSlot?: ReactNode
}

export function AppSidebar({ navMainSlot, ...props }: AppSidebarProps) {
  // Get session from NextAuth
  const { data: session, status } = useSession()
  const isLoading = status === "loading"

  // Get menu data based on permissions
  const menuData = React.useMemo(() => {
    const permissions = (session?.permissions || []) as Permission[]
    if (!permissions.length) {
      return {
        navMain: [],
        navSecondary: [],
        projects: [],
      }
    }
    return getMenuData(permissions)
  }, [session?.permissions])

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/admin/dashboard">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{appConfig.name}</span>
                  <span className="truncate text-xs">{appConfig.description}</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {isLoading ? (
          <AppSidebarSkeleton />
        ) : (
          <>
            {navMainSlot}
            <NavProjects projects={menuData.projects} />
            <NavSecondary items={menuData.navSecondary} className="mt-auto" />
          </>
        )}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
