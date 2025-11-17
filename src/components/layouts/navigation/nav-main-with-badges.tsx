"use client"

import * as React from "react"
import { useSession } from "next-auth/react"
import { NavMain } from "./nav-main"
import { useUnreadCounts } from "@/hooks/use-unread-counts"
import type { MenuItem } from "@/lib/config"

interface NavMainWithBadgesProps {
  items: MenuItem[]
}

/**
 * Client component wrapper để inject unread counts vào menu items
 */
export function NavMainWithBadges({ items }: NavMainWithBadgesProps) {
  const { data: session } = useSession()
  
  // Get unread counts
  const { data: unreadCounts } = useUnreadCounts({
    refetchInterval: 30000, // 30 seconds
    enabled: !!session?.user?.id,
  })

  // Map unread counts to menu items
  const itemsWithBadges = React.useMemo(() => {
    return items.map((item) => {
      if (item.key === "messages") {
        return {
          ...item,
          badgeCount: unreadCounts?.unreadMessages || 0,
        }
      }
      if (item.key === "notifications") {
        return {
          ...item,
          badgeCount: unreadCounts?.unreadNotifications || 0,
        }
      }
      return item
    })
  }, [items, unreadCounts])

  return <NavMain items={itemsWithBadges} />
}

