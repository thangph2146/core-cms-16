"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  BadgeHelp,
  Bell,
  FileText,
  FolderTree,
  GraduationCap,
  LayoutDashboard,
  LifeBuoy,
  LogIn,
  MessageSquare,
  Send,
  Shield,
  Tag,
  Users,
  UserCircle,
  Home,
  Info,
  Mail,
  HelpCircle,
  Upload,
} from "lucide-react"
import { NavMain } from "./nav-main"
import { useUnreadCounts } from "@/hooks/use-unread-counts"
import { useNotificationsSocketBridge } from "@/hooks/use-notifications"
import { useContactRequestsSocketBridge } from "@/features/admin/contact-requests/hooks/use-contact-requests-socket-bridge"
import { useSocket } from "@/hooks/use-socket"
import type { MenuItem } from "@/lib/config"
import type { LucideIcon } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"
import { logger } from "@/lib/config"
// Icon mapping để tạo lại icon trong client component
const iconMap: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  users: Users,
  posts: FileText,
  categories: FolderTree,
  tags: Tag,
  roles: Shield,
  students: GraduationCap,
  messages: Send,
  comments: MessageSquare,
  notifications: Bell,
  contactRequests: BadgeHelp,
  sessions: LogIn,
  uploads: Upload,
  accounts: UserCircle,
  support: LifeBuoy,
  home: Home,
  blog: FileText,
  about: Info,
  contact: Mail,
  help: HelpCircle,
}

const createIcon = (Icon: LucideIcon) =>
  React.createElement(Icon, { className: "h-4 w-4" })

interface NavMainWithBadgesProps {
  items: MenuItem[]
}

/**
 * Client component wrapper để inject unread counts vào menu items
 * Tích hợp socket để cập nhật real-time
 */
export function NavMainWithBadges({ items }: NavMainWithBadgesProps) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const userId = session?.user?.id
  const primaryRole = session?.roles?.[0]?.name ?? null

  const queryClient = useQueryClient()

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

  // Setup socket bridge cho notifications
  useNotificationsSocketBridge()

  // Setup socket bridge cho contact requests
  useContactRequestsSocketBridge()

  // Setup socket cho messages để invalidate unread counts
  const { socket } = useSocket({
    userId,
    role: primaryRole,
  })

  // Track socket connection status để tắt polling khi socket connected
  const [isSocketConnected, setIsSocketConnected] = React.useState(false)
  const [_connectionState, setConnectionState] = React.useState<"connected" | "disconnected" | "connecting">("disconnected")

  React.useEffect(() => {
    if (!socket) {
      setIsSocketConnected(false)
      setConnectionState("disconnected")
      return
    }

    setIsSocketConnected(socket.connected)
    setConnectionState(socket.connected ? "connected" : "disconnected")

    const handleConnect = () => {
      setIsSocketConnected(true)
      setConnectionState("connected")
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.unreadCounts.user(userId) })
      }
    }

    const handleDisconnect = (reason: string) => {
      setIsSocketConnected(false)
      setConnectionState("disconnected")
      // Log disconnect reason for debugging (chỉ log khi không phải manual disconnect)
      if (reason !== "io client disconnect") {
        logger.debug("NavMain: Socket disconnected", { 
          reason, 
          userId,
          willReconnect: reason !== "io server disconnect",
        })
      }
    }

    const handleConnecting = () => {
      setConnectionState("connecting")
    }

    socket.on("connect", handleConnect)
    socket.on("disconnect", handleDisconnect)
    socket.on("reconnect_attempt", handleConnecting)
    socket.on("reconnect", handleConnect)

    return () => {
      socket.off("connect", handleConnect)
      socket.off("disconnect", handleDisconnect)
      socket.off("reconnect_attempt", handleConnecting)
      socket.off("reconnect", handleConnect)
    }
  }, [socket, queryClient, userId])

  React.useEffect(() => {
    if (!socket || !userId) return

    const invalidateUnreadCounts = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.unreadCounts.user(userId) })
    }

    socket.on("message:new", invalidateUnreadCounts)
    socket.on("message:updated", invalidateUnreadCounts)

    return () => {
      socket.off("message:new", invalidateUnreadCounts)
      socket.off("message:updated", invalidateUnreadCounts)
    }
  }, [socket, userId, queryClient])

  // Get unread counts với polling fallback
  // Tắt polling khi có socket connection (socket sẽ handle real-time updates)
  const { data: unreadCounts } = useUnreadCounts({
    refetchInterval: 60000, // 60 seconds (fallback khi không có socket)
    enabled: !!userId,
    disablePolling: isSocketConnected, // Tắt polling nếu có socket connection
  })

  // Socket bridge đã handle unread counts updates, không cần invalidate ở đây nữa

  // Map unread counts và active state to menu items
  // Tạo lại icon trong client component vì React elements không thể serialize qua server/client boundary
  const itemsWithBadges = React.useMemo(() => {
    return items.map((item) => {
      const isActive = isItemActive(item)
      
      // Tạo lại icon dựa trên feature key
      const iconKey = item.key || ""
      const IconComponent = iconMap[iconKey]
      const icon = IconComponent ? createIcon(IconComponent) : item.icon
      
      let updatedItem: MenuItem = {
        ...item,
        icon,
        isActive,
      }
      
      if (item.key === "messages") {
        updatedItem = {
          ...updatedItem,
          badgeCount: unreadCounts?.unreadMessages || 0,
        }
      }
      if (item.key === "notifications") {
        // Badge count từ API đã được filter đúng (chỉ superadmin@hub.edu.vn đếm tất cả)
        updatedItem = {
          ...updatedItem,
          badgeCount: unreadCounts?.unreadNotifications || 0,
        }
      }
      if (item.key === "contactRequests") {
        updatedItem = {
          ...updatedItem,
          badgeCount: unreadCounts?.contactRequests || 0,
        }
      }
      
      return updatedItem
    })
  }, [items, unreadCounts, isItemActive])

  return <NavMain items={itemsWithBadges} />
}

