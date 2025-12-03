/**
 * Notification Bell Component với badge count
 */
"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Bell, CheckCheck, Loader2, ArrowRight } from "lucide-react"
import { useSession } from "@/lib/auth"
import { useNotifications, useMarkAllAsRead, useMarkNotificationRead, useNotificationsSocketBridge } from "@/hooks/use-notifications"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { NotificationItem } from "./notification-item"
import { Separator } from "@/components/ui/separator"
import { isSuperAdmin } from "@/lib/permissions"
import { logger } from "@/lib/config/logger"

export function NotificationBell() {
  const router = useRouter()
  const { data: session } = useSession()
  const { socket } = useNotificationsSocketBridge()
  
  // Track socket connection status để tắt polling khi socket connected
  const [isSocketConnected, setIsSocketConnected] = React.useState(false)

  React.useEffect(() => {
    if (!socket) {
      setIsSocketConnected(false)
      return
    }

    // Check initial connection status
    setIsSocketConnected(socket.connected)

    const handleConnect = () => {
      setIsSocketConnected(true)
    }

    const handleDisconnect = () => {
      setIsSocketConnected(false)
    }

    socket.on("connect", handleConnect)
    socket.on("disconnect", handleDisconnect)

    return () => {
      socket.off("connect", handleConnect)
      socket.off("disconnect", handleDisconnect)
    }
  }, [socket])
  
  // Tắt polling khi có socket connection (socket sẽ handle real-time updates)
  // Chỉ polling nếu không có socket connection (fallback)
  const { data, isLoading } = useNotifications({ 
    limit: 10, 
    disablePolling: isSocketConnected, // Tắt polling nếu có socket connection
    refetchInterval: 60000 // 60 giây (fallback khi không có socket)
  })
  const markAllAsRead = useMarkAllAsRead()
  const markAsRead = useMarkNotificationRead()
  const [open, setOpen] = React.useState(false)
  
  // Log mark all as read mutations
  React.useEffect(() => {
    if (markAllAsRead.isSuccess) {
      logger.success("NotificationBell: Mark all as read successful", {
        count: markAllAsRead.data?.count,
        userId: session?.user?.id,
      })
    }
    if (markAllAsRead.isError) {
      logger.error("NotificationBell: Mark all as read failed", markAllAsRead.error)
    }
  }, [markAllAsRead.isSuccess, markAllAsRead.isError, markAllAsRead.data, markAllAsRead.error, session?.user?.id])
  
  // Log mark as read mutations
  React.useEffect(() => {
    if (markAsRead.isSuccess) {
      logger.success("NotificationBell: Mark as read successful", {
        notificationId: markAsRead.data?.id,
        isRead: markAsRead.data?.isRead,
        userId: session?.user?.id,
      })
    }
    if (markAsRead.isError) {
      logger.error("NotificationBell: Mark as read failed", markAsRead.error)
    }
  }, [markAsRead.isSuccess, markAsRead.isError, markAsRead.data, markAsRead.error, session?.user?.id])

  const unreadCount = data?.unreadCount || 0
  const rawNotifications = React.useMemo(() => data?.notifications || [], [data?.notifications])
  
  // Filter duplicate notifications by ID (fix duplicate key issue)
  // Sử dụng useMemo với stable dependencies để tránh re-run quá nhiều lần
  const uniqueNotifications = React.useMemo(() => {
    if (!rawNotifications || rawNotifications.length === 0) {
      return []
    }
    
    const seen = new Set<string>()
    const unique: typeof rawNotifications = []
    
    for (const notification of rawNotifications) {
      if (!seen.has(notification.id)) {
        seen.add(notification.id)
        unique.push(notification)
      }
    }
    
    return unique
  }, [rawNotifications])
  
  // Track duplicates để log (trong useEffect để tránh access ref trong render)
  const duplicateIds = React.useMemo(() => {
    if (!rawNotifications || rawNotifications.length === 0) {
      return new Set<string>()
    }
    
    const seen = new Set<string>()
    const duplicates = new Set<string>()
    
    for (const notification of rawNotifications) {
      if (seen.has(notification.id)) {
        duplicates.add(notification.id)
      } else {
        seen.add(notification.id)
      }
    }
    
    return duplicates
  }, [rawNotifications])
  
  // Log duplicates trong useEffect để tránh access ref trong render
  const lastLoggedDuplicates = React.useRef<string>("")
  React.useEffect(() => {
    if (duplicateIds.size > 0) {
      const duplicateIdsStr = Array.from(duplicateIds).sort().join(",")
      
      // Chỉ log nếu duplicate IDs thay đổi
      if (duplicateIdsStr !== lastLoggedDuplicates.current) {
        logger.warn("NotificationBell: Duplicate notifications found", {
          duplicateCount: duplicateIds.size,
          duplicateIds: Array.from(duplicateIds),
          totalRaw: rawNotifications.length,
          totalUnique: uniqueNotifications.length,
          source: "query_cache",
        })
        lastLoggedDuplicates.current = duplicateIdsStr
      }
    } else {
      // Reset nếu không còn duplicates
      lastLoggedDuplicates.current = ""
    }
  }, [duplicateIds, uniqueNotifications.length, rawNotifications.length])
  
  // Check nếu user là super admin để hiển thị link đến admin notifications page
  const roles = session?.roles ?? []
  const isSuperAdminUser = isSuperAdmin(roles)
  
  // Log notifications data để debug
  React.useEffect(() => {
    if (data) {
      const currentUserId = session?.user?.id
      const ownNotifications = uniqueNotifications.filter(n => n.userId === currentUserId)
      const otherNotifications = uniqueNotifications.filter(n => n.userId !== currentUserId)
      const ownUnread = ownNotifications.filter(n => !n.isRead).length
      const otherUnread = otherNotifications.filter(n => !n.isRead).length
      
      logger.debug("NotificationBell: Notifications data updated", {
        userId: currentUserId,
        isSuperAdmin: isSuperAdminUser,
        unreadCount: data.unreadCount,
        total: data.total,
        rawNotificationsCount: rawNotifications.length,
        uniqueNotificationsCount: uniqueNotifications.length,
        ownNotificationsCount: ownNotifications.length,
        ownUnreadCount: ownUnread,
        otherNotificationsCount: otherNotifications.length,
        otherUnreadCount: otherUnread,
        notifications: uniqueNotifications.map(n => ({
          id: n.id,
          userId: n.userId,
          title: n.title,
          isRead: n.isRead,
          actionUrl: n.actionUrl,
          isOwner: n.userId === currentUserId,
        })),
      })
    }
  }, [data, rawNotifications.length, uniqueNotifications, session?.user?.id, isSuperAdminUser])

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Thông báo"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[380px] p-0 sm:w-[420px]"
        sideOffset={8}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-lg font-semibold">Thông báo</h2>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  // Log chi tiết về notifications trước khi mark all as read
                  const unreadNotifications = uniqueNotifications.filter(n => !n.isRead)
                  const ownUnreadCount = unreadNotifications.filter(n => n.userId === session?.user?.id).length
                  const otherUnreadCount = unreadNotifications.length - ownUnreadCount
                  
                  logger.info("NotificationBell: Mark all as read clicked", {
                    unreadCount,
                    ownUnreadCount,
                    otherUnreadCount,
                    userId: session?.user?.id,
                    isSuperAdmin: isSuperAdminUser,
                    note: "Super admin chỉ mark notifications của chính mình",
                  })
                  markAllAsRead.mutate()
                }}
                disabled={markAllAsRead.isPending}
                className="h-8 text-xs"
              >
                {markAllAsRead.isPending ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : (
                  <CheckCheck className="mr-1 h-3 w-3" />
                )}
                Đánh dấu tất cả đã đọc
              </Button>
            )}
          </div>
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : uniqueNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Bell className="mb-2 h-12 w-12 text-muted-foreground opacity-50" />
              <p className="text-sm font-medium">Không có thông báo</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Bạn sẽ nhận thông báo tại đây khi có cập nhật mới
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {/* Chỉ hiển thị tối đa 10 thông báo đầu tiên */}
              {uniqueNotifications.slice(0, 10).map((notification, index) => (
                <React.Fragment key={notification.id}>
                  <NotificationItem
                    notification={notification}
                    onClick={() => {
                      const isOwner = notification.userId === session?.user?.id
                      
                      logger.info("NotificationBell: Notification clicked", {
                        notificationId: notification.id,
                        title: notification.title,
                        isRead: notification.isRead,
                        actionUrl: notification.actionUrl,
                        userId: session?.user?.id,
                        notificationUserId: notification.userId,
                        isOwner,
                      })
                      
                      // Tự động mark as read khi click vào notification (nếu chưa đọc)
                      // CHỈ mark nếu là owner (không cho phép mark notifications của user khác)
                      if (!notification.isRead && isOwner) {
                        logger.debug("NotificationBell: Auto-marking as read (owner)", {
                          notificationId: notification.id,
                        })
                        markAsRead.mutate({ id: notification.id, isRead: true })
                      } else if (!notification.isRead && !isOwner) {
                        logger.warn("NotificationBell: Cannot mark as read - not owner", {
                          notificationId: notification.id,
                          userId: session?.user?.id,
                          notificationUserId: notification.userId,
                        })
                      }
                      
                      if (notification.actionUrl) {
                        logger.debug("NotificationBell: Navigating to action URL", {
                          notificationId: notification.id,
                          actionUrl: notification.actionUrl,
                        })
                        // Sử dụng Next.js router thay vì window.location để tránh reload page
                        router.push(notification.actionUrl)
                      } else {
                        logger.debug("NotificationBell: No action URL, just closing dropdown", {
                          notificationId: notification.id,
                        })
                      }
                      setOpen(false)
                    }}
                  />
                  {index < Math.min(uniqueNotifications.length, 10) - 1 && <Separator />}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        {/* Luôn hiển thị link "Xem tất cả" nếu có thông báo và user là super admin */}
        {!isLoading && uniqueNotifications.length > 0 && isSuperAdminUser && (
          <>
            <Separator />
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between"
                onClick={() => {
                  // Sử dụng Next.js router thay vì window.location để tránh reload page
                  router.push("/admin/notifications")
                  setOpen(false)
                }}
              >
                <span>Xem tất cả thông báo</span>
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

