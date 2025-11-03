import * as React from "react"
import { type LucideIcon } from "lucide-react"
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
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import type { IconName } from "@/lib/menu-data"

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

export function NavSecondary({
  items,
  ...props
}: {
  items: {
    title: string
    url: string
    icon: IconName
  }[]
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const Icon = iconMap[item.icon]
            if (!Icon) {
              console.warn(`Icon "${item.icon}" not found in iconMap`)
              return null
            }
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild size="sm">
                  <a href={item.url}>
                    <Icon />
                    <span>{item.title}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
