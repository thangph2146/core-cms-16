"use client"

import { useState, useEffect } from "react"
import {
  Folder,
  MoreHorizontal,
  Share,
  Trash2,
  type LucideIcon,
} from "lucide-react"
import {
  LayoutDashboard,
  Users,
  FileText,
  FolderTree,
  Tag,
  MessageSquare,
  Shield,
  Send,
  Bell,
  Phone,
  GraduationCap,
  Settings2,
  LifeBuoy,
  Home,
  Frame,
} from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import type { IconName } from "@/lib/config"

const iconMap: Record<IconName, LucideIcon> = {
  LayoutDashboard,
  Users,
  FileText,
  FolderTree,
  Tag,
  MessageSquare,
  Shield,
  Send,
  Bell,
  Phone,
  GraduationCap,
  Settings2,
  LifeBuoy,
  Home,
  Frame,
}

export function NavProjects({
  projects,
}: {
  projects: {
    name: string
    url: string
    icon: IconName
  }[]
}) {
  const { isMobile } = useSidebar()
  // Chỉ render sau khi component đã mount trên client để tránh hydration mismatch
  // Radix UI generate ID random khác nhau giữa server và client
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Render placeholder trên server để tránh hydration mismatch
  if (!isMounted) {
    return (
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel>Projects</SidebarGroupLabel>
        <SidebarMenu>
          {projects.map((item) => {
            const Icon = iconMap[item.icon]
            if (!Icon) {
              return null
            }
            return (
              <SidebarMenuItem key={item.name}>
                <SidebarMenuButton asChild>
                  <a href={item.url}>
                    <Icon />
                    <span>{item.name}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroup>
    )
  }

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Projects</SidebarGroupLabel>
      <SidebarMenu>
        {projects.map((item) => {
          const Icon = iconMap[item.icon]
          if (!Icon) {
            console.warn(`Icon "${item.icon}" not found in iconMap`)
            return null
          }
          return (
            <SidebarMenuItem key={item.name}>
              <SidebarMenuButton asChild>
                <a href={item.url}>
                  <Icon />
                  <span>{item.name}</span>
                </a>
              </SidebarMenuButton>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuAction showOnHover>
                    <MoreHorizontal />
                    <span className="sr-only">More</span>
                  </SidebarMenuAction>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-48"
                  side={isMobile ? "bottom" : "right"}
                  align={isMobile ? "end" : "start"}
                >
                  <DropdownMenuItem>
                    <Folder className="text-muted-foreground" />
                    <span>View Project</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Share className="text-muted-foreground" />
                    <span>Share Project</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Trash2 className="text-muted-foreground" />
                    <span>Delete Project</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
