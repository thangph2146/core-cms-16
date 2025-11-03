"use client"

import { ChevronRight } from "lucide-react"
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
  type LucideIcon,
} from "lucide-react"
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

export interface NavMainItemProps {
  title: string
  url: string
  icon: IconName
  isActive?: boolean
  items?: {
    title: string
    url: string
  }[]
}

export function NavMainItem({
  title,
  url,
  icon,
  isActive = false,
  items,
}: NavMainItemProps) {
  const Icon = iconMap[icon]
  
  if (!Icon) {
    console.warn(`Icon "${icon}" not found in iconMap`)
    return null
  }

  return (
    <Collapsible asChild defaultOpen={isActive}>
      <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip={title}>
          <Link href={url}>
            <Icon />
            <span>{title}</span>
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
                  <SidebarMenuSubItem key={subItem.title}>
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

