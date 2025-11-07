"use client"

import { User, Globe, MapPin, Calendar, CheckCircle2, XCircle, Edit, Key, RefreshCw, Clock } from "lucide-react"
import { ResourceDetailPage, type ResourceDetailField, type ResourceDetailSection } from "@/features/admin/resources/components"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { formatDateVi } from "../utils"

export interface SessionDetailData {
  id: string
  userId: string
  accessToken: string
  refreshToken: string
  userAgent: string | null
  ipAddress: string | null
  isActive: boolean
  expiresAt: string
  lastActivity: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  userName: string | null
  userEmail: string
  [key: string]: unknown
}

export interface SessionDetailClientProps {
  sessionId: string
  session: SessionDetailData
  backUrl?: string
}

export function SessionDetailClient({ sessionId, session, backUrl = "/admin/sessions" }: SessionDetailClientProps) {
  const router = useRouter()

  const detailFields: ResourceDetailField<SessionDetailData>[] = [
    {
      name: "userId",
      label: "Người dùng",
      type: "custom",
      section: "basic",
      render: (value, data) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="font-medium">{data.userName || data.userEmail || "—"}</div>
            {data.userEmail && data.userName && (
              <div className="text-sm text-muted-foreground">{data.userEmail}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      name: "accessToken",
      label: "Access Token",
      type: "custom",
      section: "security",
      render: (value) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-1/10">
            <Key className="h-5 w-5 text-chart-1" />
          </div>
          <div className="font-mono text-xs break-all">{String(value || "—")}</div>
        </div>
      ),
    },
    {
      name: "refreshToken",
      label: "Refresh Token",
      type: "custom",
      section: "security",
      render: (value) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-2/10">
            <RefreshCw className="h-5 w-5 text-chart-2" />
          </div>
          <div className="font-mono text-xs break-all">{String(value || "—")}</div>
        </div>
      ),
    },
    {
      name: "userAgent",
      label: "User Agent",
      type: "custom",
      section: "security",
      render: (value) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-3/10">
            <Globe className="h-5 w-5 text-chart-3" />
          </div>
          <div className="text-sm break-all">{String(value || "—")}</div>
        </div>
      ),
    },
    {
      name: "ipAddress",
      label: "IP Address",
      type: "custom",
      section: "security",
      render: (value) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-4/10">
            <MapPin className="h-5 w-5 text-chart-4" />
          </div>
          <div className="font-medium">{String(value || "—")}</div>
        </div>
      ),
    },
    {
      name: "isActive",
      label: "Trạng thái",
      type: "custom",
      section: "status",
      render: (value) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-5/10">
            {value ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
          </div>
          <div>
            <Badge variant={value ? "default" : "secondary"}>
              {value ? "Hoạt động" : "Tạm khóa"}
            </Badge>
          </div>
        </div>
      ),
    },
    {
      name: "expiresAt",
      label: "Thời gian hết hạn",
      type: "custom",
      section: "status",
      render: (value) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-5/10">
            <Calendar className="h-5 w-5 text-chart-5" />
          </div>
          <div>
            <div className="font-medium">{value ? formatDateVi(String(value)) : "—"}</div>
          </div>
        </div>
      ),
    },
    {
      name: "lastActivity",
      label: "Hoạt động cuối",
      type: "custom",
      section: "status",
      render: (value) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-5/10">
            <Clock className="h-5 w-5 text-chart-5" />
          </div>
          <div>
            <div className="font-medium">{value ? formatDateVi(String(value)) : "—"}</div>
          </div>
        </div>
      ),
    },
    {
      name: "createdAt",
      label: "Ngày tạo",
      type: "custom",
      section: "status",
      render: (value) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-5/10">
            <Calendar className="h-5 w-5 text-chart-5" />
          </div>
          <div>
            <div className="font-medium">{value ? formatDateVi(String(value)) : "—"}</div>
          </div>
        </div>
      ),
    },
  ]

  const detailSections: ResourceDetailSection<SessionDetailData>[] = [
    {
      id: "basic",
      title: "Thông tin cơ bản",
      description: "Thông tin chính về session",
    },
    {
      id: "security",
      title: "Bảo mật",
      description: "Thông tin bảo mật và mạng",
    },
    {
      id: "status",
      title: "Trạng thái và thời gian",
      description: "Trạng thái hoạt động và thông tin thời gian",
    },
  ]

  return (
    <ResourceDetailPage<SessionDetailData>
      data={session}
      fields={detailFields}
      detailSections={detailSections}
      title={`Session ${session.userName || session.userEmail || session.id}`}
      description={`Chi tiết session`}
      backUrl={backUrl}
      backLabel="Quay lại danh sách"
      actions={
        <Button
          variant="outline"
          onClick={() => router.push(`/admin/sessions/${sessionId}/edit`)}
          className="gap-2"
        >
          <Edit className="h-4 w-4" />
          Chỉnh sửa
        </Button>
      }
    />
  )
}

