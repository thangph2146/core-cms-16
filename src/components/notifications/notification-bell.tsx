/**
 * Notification Bell Component với badge count
 */
"use client"

import * as React from "react"
import { Bell, CheckCheck, Loader2 } from "lucide-react"
import { useNotifications, useMarkAllAsRead, useNotificationsSocketBridge } from "@/hooks/use-notifications"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { NotificationItem } from "./notification-item"
import { Separator } from "@/components/ui/separator"

export function NotificationBell() {
  const { data, isLoading } = useNotifications({ limit: 10, refetchInterval: 30000 })
  const markAllAsRead = useMarkAllAsRead()
  const [open, setOpen] = React.useState(false)
  
  // Khởi tạo socket connection cho real-time notifications
  useNotificationsSocketBridge()

  const unreadCount = data?.unreadCount || 0
  const notifications = data?.notifications || []

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
              {notifications.map((notification, index) => (
                <React.Fragment key={notification.id}>
                  <NotificationItem
                    notification={notification}
                    onClick={() => {
                      if (notification.actionUrl) {
                        window.location.href = notification.actionUrl
                      }
                      setOpen(false)
                    }}
                  />
                  {index < notifications.length - 1 && <Separator />}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        {data && data.hasMore && (
          <>
            <Separator />
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => {
                  window.location.href = "/admin/notifications"
                  setOpen(false)
                }}
              >
                Xem tất cả thông báo
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

