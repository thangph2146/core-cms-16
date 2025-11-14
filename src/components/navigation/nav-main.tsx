import { NavMainItem } from "./nav-main-item.client"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
} from "@/components/ui/sidebar"
import type { MenuItem } from "@/lib/config"

/**
 * NavMain Server Component
 * 
 * Renders navigation items based on menu items passed from layout
 */
export function NavMain({ items = [] }: { items?: MenuItem[] }) {
  if (!items.length) {
    return null
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <NavMainItem
            key={item.url}
            title={item.title}
            url={item.url}
            icon={item.icon}
            isActive={item.isActive}
            items={item.items?.map((subItem) => ({
              title: subItem.title,
              url: subItem.url,
            }))}
          />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
