/**
 * Notification Item Component
 */
"use client"

import * as React from "react"
import { formatDistanceToNow } from "date-fns"
import { vi } from "date-fns/locale/vi"
import {
  AlertCircle,
  CheckCircle2,
  Info,
  MessageSquare,
  EyeOff,
} from "lucide-react"
import { useMarkNotificationRead } from "@/hooks/use-notifications"
import type { Notification } from "@/hooks/use-notifications"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface NotificationItemProps {
  notification: Notification
  onClick?: () => void
}

const kindIcons = {
  MESSAGE: MessageSquare,
  SYSTEM: Info,
  ANNOUNCEMENT: Info,
  ALERT: AlertCircle,
  WARNING: AlertCircle,
  SUCCESS: CheckCircle2,
  INFO: Info,
}

const kindStyles = {
  MESSAGE: "border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20",
  SYSTEM: "border-l-gray-500 bg-gray-50/50 dark:bg-gray-950/20",
  ANNOUNCEMENT: "border-l-purple-500 bg-purple-50/50 dark:bg-purple-950/20",
  ALERT: "border-l-red-500 bg-red-50/50 dark:bg-red-950/20",
  WARNING: "border-l-orange-500 bg-orange-50/50 dark:bg-orange-950/20",
  SUCCESS: "border-l-green-500 bg-green-50/50 dark:bg-green-950/20",
  INFO: "border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20",
}

export function NotificationItem({
  notification,
  onClick,
}: NotificationItemProps) {
  const markAsRead = useMarkNotificationRead()

  const Icon = kindIcons[notification.kind] || Info
  const styleClass = kindStyles[notification.kind] || kindStyles.INFO

  const handleToggleRead = (e: React.MouseEvent) => {
    e.stopPropagation()
    // Toggle giữa đã đọc và chưa đọc
    markAsRead.mutate({ id: notification.id, isRead: !notification.isRead })
  }

  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), {
    addSuffix: true,
    locale: vi,
  })

  return (
    <div
      className={cn(
        "group relative border-l-4 p-4 transition-colors hover:bg-accent/10 cursor-pointer",
        styleClass,
        !notification.isRead && "bg-accent/10"
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onClick?.()
        }
      }}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex-shrink-0">
          <Icon
            className={cn(
              "h-5 w-5",
              notification.kind === "SUCCESS" && "text-green-600",
              notification.kind === "WARNING" && "text-orange-600",
              notification.kind === "ALERT" && "text-red-600",
              notification.kind === "INFO" && "text-blue-600",
              notification.kind === "MESSAGE" && "text-blue-600",
              notification.isRead && "opacity-50"
            )}
          />
        </div>

        <div className="flex-1 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h4
              className={cn(
                "text-sm font-medium leading-none",
                !notification.isRead && "font-semibold"
              )}
            >
              {notification.title}
            </h4>
            {!notification.isRead && (
              <div className="h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
            )}
          </div>

          {notification.description && (
            <p
              className={cn(
                "text-sm text-muted-foreground line-clamp-2",
                notification.isRead && "opacity-70"
              )}
            >
              {notification.description}
            </p>
          )}

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-muted-foreground">{timeAgo}</span>
            <div className="flex items-center gap-2">
              <Button
                variant={notification.isRead ? "outline" : "default"}
                size="sm"
                className={cn(
                  "h-8 gap-1.5 text-xs",
                  notification.isRead
                    ? "border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-950/30"
                    : "bg-green-600 text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
                )}
                onClick={handleToggleRead}
                title={notification.isRead ? "Đánh dấu chưa đọc" : "Đánh dấu đã đọc"}
              >
                {notification.isRead ? (
                  <>
                    <EyeOff className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Chưa đọc</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Đã đọc</span>
                  </>
                )}
              </Button>
           
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

