"use client"

import * as React from "react"
import { 
  Bell, 
  User, 
  Calendar, 
  Clock, 
  ExternalLink,
  FileText,
  AlertCircle,
  Info,
  CheckCircle,
  XCircle as XCircleIcon
} from "lucide-react"
import { ResourceDetailPage, type ResourceDetailField, type ResourceDetailSection } from "@/features/admin/resources/components"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { formatDateVi } from "@/features/admin/users/utils"
import { cn } from "@/lib/utils"

const NOTIFICATION_KINDS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  MESSAGE: { label: "Tin nhắn", variant: "default" },
  SYSTEM: { label: "Hệ thống", variant: "secondary" },
  ANNOUNCEMENT: { label: "Thông báo", variant: "outline" },
  ALERT: { label: "Cảnh báo", variant: "destructive" },
  WARNING: { label: "Cảnh báo", variant: "destructive" },
  SUCCESS: { label: "Thành công", variant: "default" },
  INFO: { label: "Thông tin", variant: "secondary" },
}

export interface NotificationDetailData extends Record<string, unknown> {
  id: string
  userId: string
  user: {
    id: string
    email: string
    name: string | null
  }
  kind: string
  title: string
  description: string | null
  isRead: boolean
  actionUrl: string | null
  metadata: unknown
  expiresAt: string | null
  createdAt: string
  readAt: string | null
}

export interface NotificationDetailClientProps {
  notification: NotificationDetailData
  backUrl?: string
}

// Reusable field item component
interface FieldItemProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  children: React.ReactNode
  iconColor?: string
}

const FieldItem = ({ icon: Icon, label, children, iconColor = "bg-muted" }: FieldItemProps) => (
  <div className="flex items-start gap-3">
    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconColor}`}>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-xs font-medium text-muted-foreground mb-1.5">{label}</div>
      {children}
    </div>
  </div>
)

export function NotificationDetailClient({ notification, backUrl = "/admin/notifications" }: NotificationDetailClientProps) {
  const detailFields: ResourceDetailField<NotificationDetailData>[] = []

  const detailSections: ResourceDetailSection<NotificationDetailData>[] = [
    {
      id: "basic",
      title: "Thông tin cơ bản",
      description: "Thông tin chính của thông báo",
      fieldsContent: (_fields, data) => {
        const notificationData = data as NotificationDetailData
        const kindConfigData = NOTIFICATION_KINDS[notificationData.kind] || { label: notificationData.kind, variant: "secondary" as const }
        
        return (
          <div className="space-y-6">
            {/* Kind & Title */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-muted-foreground mb-1.5">Loại thông báo</div>
                  <Badge variant={kindConfigData.variant} className="text-xs">
                    {kindConfigData.label}
                  </Badge>
                </div>
              </div>

              <FieldItem icon={FileText} label="Tiêu đề">
                <div className="text-sm font-medium text-foreground">
                  {notificationData.title || "—"}
                </div>
              </FieldItem>
            </div>

            {/* Description */}
            {notificationData.description && (
              <>
                <Separator />
                <Card className="border border-border/50 bg-card p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-foreground mb-2">Mô tả</h3>
                      <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground break-words">
                        {notificationData.description || "—"}
                      </div>
                    </div>
                  </div>
                </Card>
              </>
            )}

            <Separator />

            {/* User */}
            <FieldItem icon={User} label="Người dùng">
              <div className="space-y-0.5">
                <div className="text-sm font-medium text-foreground">
                  {notificationData.user?.email || "—"}
                </div>
                {notificationData.user?.name && (
                  <div className="text-xs text-muted-foreground">
                    {notificationData.user.name}
                  </div>
                )}
              </div>
            </FieldItem>
          </div>
        )
      },
    },
    {
      id: "status",
      title: "Trạng thái",
      description: "Thông tin trạng thái của thông báo",
      fieldsContent: (_fields, data) => {
        const notificationData = data as NotificationDetailData
        
        return (
          <div className="space-y-6">
            {/* Read Status */}
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                {notificationData.isRead ? (
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-500" />
                ) : (
                  <XCircleIcon className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-muted-foreground mb-1.5">Trạng thái đọc</div>
                <Badge
                  className={cn(
                    "text-sm font-medium px-2.5 py-1",
                    notificationData.isRead
                      ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20"
                      : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                  )}
                  variant={notificationData.isRead ? "default" : "secondary"}
                >
                  {notificationData.isRead ? (
                    <>
                      <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                      Đã đọc
                    </>
                  ) : (
                    <>
                      <XCircleIcon className="mr-1.5 h-3.5 w-3.5" />
                      Chưa đọc
                    </>
                  )}
                </Badge>
              </div>
            </div>

            {notificationData.readAt && (
              <>
                <Separator />
                <FieldItem icon={Clock} label="Ngày đọc">
                  <div className="text-sm font-medium text-foreground">
                    {formatDateVi(notificationData.readAt)}
                  </div>
                </FieldItem>
              </>
            )}
          </div>
        )
      },
    },
    {
      id: "additional",
      title: "Thông tin bổ sung",
      description: "Thông tin chi tiết về thông báo",
      fieldsContent: (_fields, data) => {
        const notificationData = data as NotificationDetailData
        
        return (
          <div className="space-y-6">
            {/* Action URL */}
            {notificationData.actionUrl && (
              <>
                <FieldItem icon={ExternalLink} label="URL hành động">
                  <a
                    href={notificationData.actionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 hover:underline transition-colors truncate"
                  >
                    <span className="truncate">{notificationData.actionUrl}</span>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" />
                  </a>
                </FieldItem>
                <Separator />
              </>
            )}

            {/* Timestamps */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldItem icon={Calendar} label="Ngày tạo">
                <div className="text-sm font-medium text-foreground">
                  {notificationData.createdAt ? formatDateVi(notificationData.createdAt) : "—"}
                </div>
              </FieldItem>

              {notificationData.expiresAt && (
                <FieldItem 
                  icon={notificationData.expiresAt && new Date(notificationData.expiresAt) < new Date() ? AlertCircle : Info} 
                  label="Ngày hết hạn"
                >
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-foreground">
                      {formatDateVi(notificationData.expiresAt)}
                    </div>
                    {new Date(notificationData.expiresAt) < new Date() && (
                      <Badge variant="destructive" className="text-xs">
                        Đã hết hạn
                      </Badge>
                    )}
                  </div>
                </FieldItem>
              )}
            </div>
          </div>
        )
      },
    },
  ]

  return (
    <ResourceDetailPage<NotificationDetailData>
      data={notification}
      fields={detailFields}
      detailSections={detailSections}
      title={notification.title}
      description={`Thông báo ${(NOTIFICATION_KINDS[notification.kind] || { label: notification.kind }).label.toLowerCase()} cho ${notification.user?.email || "người dùng"}`}
      backUrl={backUrl}
      backLabel="Quay lại danh sách"
    />
  )
}

