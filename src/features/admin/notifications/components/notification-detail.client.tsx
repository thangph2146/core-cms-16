"use client"

import { motion } from "framer-motion"
import { 
  Bell, 
  User, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle,
  ArrowLeft,
  ExternalLink,
  FileText,
  AlertCircle,
  Info,
  CheckCircle,
  XCircle as XCircleIcon
} from "lucide-react"
import { ResourceDetailPage, type ResourceDetailField } from "@/features/admin/resources/components"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { formatDateVi } from "@/features/admin/users/utils"

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

export function NotificationDetailClient({ notification, backUrl = "/admin/notifications" }: NotificationDetailClientProps) {
  const router = useRouter()

  const kindConfig = NOTIFICATION_KINDS[notification.kind] || { label: notification.kind, variant: "secondary" as const }

  const detailFields: ResourceDetailField<NotificationDetailData>[] = [
    {
      name: "kind",
      label: "Loại thông báo",
      type: "custom",
      render: () => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
            <Bell className="h-4 w-4 text-primary" />
          </div>
          <Badge variant={kindConfig.variant} className="text-xs">{kindConfig.label}</Badge>
        </div>
      ),
    },
    {
      name: "title",
      label: "Tiêu đề",
      type: "custom",
      render: (value) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-chart-1/10">
            <FileText className="h-4 w-4 text-chart-1" />
          </div>
          <div className="text-sm">{String(value || "—")}</div>
        </div>
      ),
    },
    {
      name: "description",
      label: "Mô tả",
      type: "custom",
      render: (value) => (
        <div>
          {value ? (
            <p className="text-sm leading-normal">{String(value)}</p>
          ) : (
            <span className="text-muted-foreground text-sm">—</span>
          )}
        </div>
      ),
    },
    {
      name: "user",
      label: "Người dùng",
      type: "custom",
      render: (value) => {
        const user = value as NotificationDetailData["user"]
        return (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-chart-2/10">
              <User className="h-4 w-4 text-chart-2" />
            </div>
            <div>
              <div className="text-sm">{user?.email || "—"}</div>
              {user?.name && <div className="text-xs text-muted-foreground">{user.name}</div>}
            </div>
          </div>
        )
      },
    },
    {
      name: "isRead",
      label: "Trạng thái đọc",
      type: "custom",
      render: (value) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-chart-3/10">
            {value ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <XCircleIcon className="h-4 w-4 text-orange-500" />
            )}
          </div>
          <Badge variant={value ? "default" : "secondary"} className="text-xs">
            {value ? "Đã đọc" : "Chưa đọc"}
          </Badge>
        </div>
      ),
    },
    {
      name: "actionUrl",
      label: "URL hành động",
      type: "custom",
      render: (value) => {
        const url = value as string | null
        if (!url) return <span className="text-muted-foreground">—</span>
        return (
          <div className="flex items-center gap-2">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline flex items-center gap-1"
            >
              {url}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )
      },
    },
    {
      name: "createdAt",
      label: "Ngày tạo",
      type: "custom",
      render: (value) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-chart-4/10">
            <Calendar className="h-4 w-4 text-chart-4" />
          </div>
          <div className="text-sm">
            {value ? formatDateVi(value as string) : "—"}
          </div>
        </div>
      ),
    },
    {
      name: "readAt",
      label: "Ngày đọc",
      type: "custom",
      render: (value) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-chart-5/10">
            <Clock className="h-4 w-4 text-chart-5" />
          </div>
          <div className="text-sm">
            {value ? formatDateVi(value as string) : <span className="text-muted-foreground">Chưa đọc</span>}
          </div>
        </div>
      ),
    },
    {
      name: "expiresAt",
      label: "Ngày hết hạn",
      type: "custom",
      render: (value) => {
        const expiresAt = value as string | null
        if (!expiresAt) return <span className="text-muted-foreground text-sm">Không có hạn</span>
        const isExpired = new Date(expiresAt) < new Date()
        return (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-chart-1/10">
              {isExpired ? (
                <AlertCircle className="h-4 w-4 text-red-500" />
              ) : (
                <Info className="h-4 w-4 text-chart-1" />
              )}
            </div>
            <div>
              <div className="text-sm">{formatDateVi(expiresAt)}</div>
              {isExpired && (
                <Badge variant="destructive" className="mt-1 text-xs">
                  Đã hết hạn
                </Badge>
              )}
            </div>
          </div>
        )
      },
    },
  ]

  // Split fields into sections
  const mainFields = detailFields.filter(f => 
    ["kind", "title", "description", "user"].includes(String(f.name))
  )
  const statusFields = detailFields.filter(f => 
    ["isRead", "readAt"].includes(String(f.name))
  )
  const metadataFields = detailFields.filter(f => 
    ["createdAt", "expiresAt", "actionUrl"].includes(String(f.name))
  )

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8">
      {/* Back Button */}
      {backUrl && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(backUrl)}
          className="self-start"
        >
          <ArrowLeft className="mr-2 h-5 w-5" />
          Quay lại danh sách
        </Button>
      )}

      {/* Hero Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-background via-background/95 to-background/90 backdrop-blur-sm shadow-xl"
      >
        {/* Gradient background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-chart-1/5 pointer-events-none" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        
        <div className="relative p-6 md:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Icon */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5, type: "spring" }}
              className="relative"
            >
              <div className="relative">
                <div className="flex h-24 w-24 md:h-32 md:w-32 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-chart-1 shadow-xl border-4 border-background">
                  <Bell className="h-12 w-12 md:h-16 md:w-16 text-primary-foreground" />
                </div>
                {notification.isRead ? (
                  <div className="absolute bottom-0 right-0 h-6 w-6 md:h-8 md:w-8 rounded-full bg-green-500 border-4 border-background shadow-lg flex items-center justify-center">
                    <CheckCircle2 className="h-3 w-3 md:h-4 md:w-4 text-white" />
                  </div>
                ) : (
                  <div className="absolute top-0 right-0 h-6 w-6 md:h-8 md:w-8 rounded-full bg-orange-500 border-4 border-background shadow-lg flex items-center justify-center">
                    <XCircle className="h-3 w-3 md:h-4 md:w-4 text-white" />
                  </div>
                )}
              </div>
            </motion.div>

            {/* Notification Info */}
            <div className="flex-1 space-y-3">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                  {notification.title}
                </h1>
                <div className="text-muted-foreground mt-1 flex items-center gap-2">
                  <Badge variant={kindConfig.variant}>{kindConfig.label}</Badge>
                </div>
              </div>

              {/* User Info */}
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {notification.user.email}
                  {notification.user.name && ` (${notification.user.name})`}
                </span>
              </div>

              {/* Status */}
              <div className="flex items-center gap-3 pt-2">
                <Badge variant={notification.isRead ? "default" : "secondary"}>
                  {notification.isRead ? "Đã đọc" : "Chưa đọc"}
                </Badge>
                {notification.createdAt && (
                  <span className="text-xs text-muted-foreground">
                    {formatDateVi(notification.createdAt)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Detail Sections */}
      <ResourceDetailPage
        data={notification}
        fields={mainFields}
        sections={[
          {
            title: "Trạng thái",
            description: "Thông tin trạng thái của thông báo",
            fields: statusFields,
          },
          {
            title: "Thông tin bổ sung",
            description: "Thông tin chi tiết về thông báo",
            fields: metadataFields,
          },
        ]}
        backUrl={backUrl}
        backLabel="Quay lại danh sách"
      />
    </div>
  )
}

