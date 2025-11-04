import { getSession } from "@/lib/auth/auth-server"
import { getMenuData } from "@/lib/config"
import { NavMainItem } from "./nav-main-item.client"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
} from "@/components/ui/sidebar"
import type { MenuItem } from "@/lib/config"
import type { Permission } from "@/lib/permissions"

/**
 * NavMain Server Component
 * 
 * Fetches session and menu data on the server
 * Renders navigation items based on user permissions
 */
export async function NavMain() {
  const session = await getSession()
  
  if (!session?.permissions || session.permissions.length === 0) {
    return null
  }

  const menuData = getMenuData(session.permissions as Permission[])
  const items: MenuItem[] = menuData.navMain

  if (!items.length) {
    return null
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <NavMainItem
            key={item.title}
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
