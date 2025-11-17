"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { useQueryClient } from "@tanstack/react-query"
import { NavMain } from "./nav-main"
import { useUnreadCounts } from "@/hooks/use-unread-counts"
import { useNotificationsSocketBridge } from "@/hooks/use-notifications"
import { useSocket } from "@/hooks/use-socket"
import { queryKeys } from "@/lib/query-keys"
import type { MenuItem } from "@/lib/config"

interface NavMainWithBadgesProps {
  items: MenuItem[]
}

/**
 * Client component wrapper để inject unread counts vào menu items
 * Tích hợp socket để cập nhật real-time
 */
export function NavMainWithBadges({ items }: NavMainWithBadgesProps) {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const pathname = usePathname()
  const userId = session?.user?.id
  const primaryRole = session?.roles?.[0]?.name ?? null

  // Helper function để check nếu pathname match với menu item URL
  const isItemActive = React.useCallback((item: MenuItem): boolean => {
    if (!pathname) return false
    
    // Normalize paths để so sánh
    const normalizedPathname = pathname.toLowerCase()
    const normalizedItemUrl = item.url.toLowerCase()
    
    // Exact match
    if (normalizedPathname === normalizedItemUrl) return true
    
    // Check sub-items trước (quan trọng cho messages có sub-items)
    if (item.items && item.items.length > 0) {
      const hasActiveSubItem = item.items.some((subItem) => {
        const normalizedSubUrl = subItem.url.toLowerCase()
        return normalizedPathname === normalizedSubUrl || normalizedPathname.startsWith(normalizedSubUrl + "/")
      })
      if (hasActiveSubItem) return true
    }
    
    // Check nếu pathname bắt đầu với item.url (cho nested routes)
    // Ví dụ: /parent/messages/inbox sẽ active menu item có url /parent/messages/inbox
    // Nhưng cần cẩn thận để không match quá rộng (ví dụ: /parent/messages/inbox không nên active /parent/messages)
    if (normalizedPathname.startsWith(normalizedItemUrl + "/")) {
      // Chỉ active nếu không có sub-items hoặc sub-items không match
      // Nếu có sub-items và không có sub-item nào match, thì không active parent
      if (item.items && item.items.length > 0) {
        // Đã check sub-items ở trên, nếu đến đây thì không có sub-item nào match
        return false
      }
      return true
    }
    
    return false
  }, [pathname])

  // Get unread counts với polling fallback
  const { data: unreadCounts } = useUnreadCounts({
    refetchInterval: 30000, // 30 seconds (fallback khi không có socket)
    enabled: !!userId,
  })

  // Setup socket bridge cho notifications
  useNotificationsSocketBridge()

  // Setup socket cho messages để invalidate unread counts
  const { socket } = useSocket({
    userId,
    role: primaryRole,
  })

  // Invalidate unread counts khi có socket events
  React.useEffect(() => {
    if (!socket || !userId) return

    const handleMessageNew = () => {
      // Invalidate unread counts khi có message mới
      queryClient.invalidateQueries({
        queryKey: queryKeys.unreadCounts.user(userId),
      })
    }

    const handleMessageUpdated = () => {
      // Invalidate unread counts khi message được cập nhật (read/unread)
      queryClient.invalidateQueries({
        queryKey: queryKeys.unreadCounts.user(userId),
      })
    }

    const handleNotificationNew = () => {
      // Invalidate unread counts khi có notification mới
      queryClient.invalidateQueries({
        queryKey: queryKeys.unreadCounts.user(userId),
      })
    }

    const handleNotificationUpdated = () => {
      // Invalidate unread counts khi notification được cập nhật
      queryClient.invalidateQueries({
        queryKey: queryKeys.unreadCounts.user(userId),
      })
    }

    // Listen to socket events
    if (socket.connected) {
      socket.on("message:new", handleMessageNew)
      socket.on("message:updated", handleMessageUpdated)
      socket.on("notification:new", handleNotificationNew)
      socket.on("notification:updated", handleNotificationUpdated)
    } else {
      const onConnect = () => {
        socket.on("message:new", handleMessageNew)
        socket.on("message:updated", handleMessageUpdated)
        socket.on("notification:new", handleNotificationNew)
        socket.on("notification:updated", handleNotificationUpdated)
      }
      socket.once("connect", onConnect)
    }

    return () => {
      if (socket) {
        socket.off("message:new", handleMessageNew)
        socket.off("message:updated", handleMessageUpdated)
        socket.off("notification:new", handleNotificationNew)
        socket.off("notification:updated", handleNotificationUpdated)
      }
    }
  }, [socket, userId, queryClient])

  // Map unread counts và active state to menu items
  const itemsWithBadges = React.useMemo(() => {
    return items.map((item) => {
      const isActive = isItemActive(item)
      
      let updatedItem: MenuItem = {
        ...item,
        isActive,
      }
      
      if (item.key === "messages") {
        updatedItem = {
          ...updatedItem,
          badgeCount: unreadCounts?.unreadMessages || 0,
        }
      }
      if (item.key === "notifications") {
        updatedItem = {
          ...updatedItem,
          badgeCount: unreadCounts?.unreadNotifications || 0,
        }
      }
      
      return updatedItem
    })
  }, [items, unreadCounts, isItemActive])

  return <NavMain items={itemsWithBadges} />
}

