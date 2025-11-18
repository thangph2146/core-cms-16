/**
 * Notification Bell Component với badge count
 */
"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Bell, CheckCheck, Loader2, ArrowRight } from "lucide-react"
import { useSession } from "next-auth/react"
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

export function NotificationBell() {
  const router = useRouter()
  const { data: session } = useSession()
  const { socket } = useNotificationsSocketBridge()
  
  // Tắt polling khi có socket connection (socket sẽ handle real-time updates)
  // Chỉ polling nếu không có socket connection (fallback)
  const { data, isLoading } = useNotifications({ 
    limit: 10, 
    disablePolling: !!socket, // Tắt polling nếu có socket
    refetchInterval: 30000 // 30 giây (fallback khi không có socket)
  })
  const markAllAsRead = useMarkAllAsRead()
  const markAsRead = useMarkNotificationRead()
  const [open, setOpen] = React.useState(false)

  const unreadCount = data?.unreadCount || 0
  const notifications = data?.notifications || []
  
  // Check nếu user là super admin để hiển thị link đến admin notifications page
  const roles = session?.roles ?? []
  const isSuperAdminUser = isSuperAdmin(roles)

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
          ) : notifications.length === 0 ? (
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
              {notifications.slice(0, 10).map((notification, index) => (
                <React.Fragment key={notification.id}>
                  <NotificationItem
                    notification={notification}
                    onClick={() => {
                      // Tự động mark as read khi click vào notification (nếu chưa đọc)
                      if (!notification.isRead) {
                        markAsRead.mutate({ id: notification.id, isRead: true })
                      }
                      if (notification.actionUrl) {
                        // Sử dụng Next.js router thay vì window.location để tránh reload page
                        router.push(notification.actionUrl)
                      }
                      setOpen(false)
                    }}
                  />
                  {index < Math.min(notifications.length, 10) - 1 && <Separator />}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        {/* Luôn hiển thị link "Xem tất cả" nếu có thông báo và user là super admin */}
        {!isLoading && notifications.length > 0 && isSuperAdminUser && (
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

