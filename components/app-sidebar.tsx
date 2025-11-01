"use client"

import * as React from "react"
import { Command } from "lucide-react"
import { useSession } from "next-auth/react"
import { getMenuData } from "@/lib/menu-data"
import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
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

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  // Get session from NextAuth
  const { data: session, status } = useSession()
  const isLoading = status === "loading"

  // Get permissions from session
  const permissions = ((session as any)?.permissions || []) as Permission[]

  // Get menu data based on permissions
  const menuData = React.useMemo(() => {
    if (!permissions.length) {
      return {
        navMain: [],
        navSecondary: [],
        projects: [],
      }
    }
    return getMenuData(permissions)
  }, [permissions])

  const userData = session?.user
    ? {
        name: session.user.name || session.user.email || "",
        email: session.user.email || "",
        avatar: session.user.image || undefined,
      }
    : {
        name: "Guest",
        email: "",
        avatar: undefined,
      }

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
                  <span className="truncate font-medium">CMS System</span>
                  <span className="truncate text-xs">Hệ thống quản trị</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {isLoading ? (
          <div className="p-4 text-sm text-muted-foreground">Đang tải...</div>
        ) : (
          <>
            <NavMain items={menuData.navMain} />
            <NavProjects projects={menuData.projects} />
            <NavSecondary items={menuData.navSecondary} className="mt-auto" />
          </>
        )}
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={{
            name: userData.name,
            email: userData.email,
            avatar: userData.avatar || "/avatars/default.jpg",
          }}
        />
      </SidebarFooter>
    </Sidebar>
  )
}
