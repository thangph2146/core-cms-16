"use client"

import { User, Mail, Phone, FileText, MessageSquare, AlertCircle, UserCheck, Calendar, Clock, Edit } from "lucide-react"
import { ResourceDetailPage, type ResourceDetailField } from "@/features/admin/resources/components"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { formatDateVi } from "../utils"

const statusLabels: Record<string, string> = {
  NEW: "Mới",
  IN_PROGRESS: "Đang xử lý",
  RESOLVED: "Đã xử lý",
  CLOSED: "Đã đóng",
}

const priorityLabels: Record<string, string> = {
  LOW: "Thấp",
  MEDIUM: "Trung bình",
  HIGH: "Cao",
  URGENT: "Khẩn cấp",
}

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  NEW: "default",
  IN_PROGRESS: "secondary",
  RESOLVED: "outline",
  CLOSED: "destructive",
}

const priorityColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  LOW: "outline",
  MEDIUM: "default",
  HIGH: "secondary",
  URGENT: "destructive",
}

export interface ContactRequestDetailData {
  id: string
  name: string
  email: string
  phone: string | null
  subject: string
  content: string
  status: string
  priority: string
  isRead: boolean
  assignedToId: string | null
  assignedTo: {
    id: string
    name: string | null
    email: string
  } | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  [key: string]: unknown
}

export interface ContactRequestDetailClientProps {
  contactRequestId: string
  contactRequest: ContactRequestDetailData
  backUrl?: string
}

export function ContactRequestDetailClient({ contactRequestId, contactRequest, backUrl = "/admin/contact-requests" }: ContactRequestDetailClientProps) {
  const router = useRouter()

  const detailFields: ResourceDetailField<ContactRequestDetailData>[] = [
    {
      name: "name",
      label: "Tên người liên hệ",
      type: "custom",
      render: (value) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div className="font-medium">{String(value || "—")}</div>
        </div>
      ),
    },
    {
      name: "email",
      label: "Email",
      type: "custom",
      render: (value) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-1/10">
            <Mail className="h-5 w-5 text-chart-1" />
          </div>
          <div className="font-medium">{String(value || "—")}</div>
        </div>
      ),
    },
    {
      name: "phone",
      label: "Số điện thoại",
      type: "custom",
      render: (value) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-2/10">
            <Phone className="h-5 w-5 text-chart-2" />
          </div>
          <div className="font-medium">{value ? String(value) : "—"}</div>
        </div>
      ),
    },
    {
      name: "subject",
      label: "Tiêu đề",
      type: "custom",
      render: (value) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-3/10">
            <FileText className="h-5 w-5 text-chart-3" />
          </div>
          <div className="font-medium">{String(value || "—")}</div>
        </div>
      ),
    },
    {
      name: "content",
      label: "Nội dung",
      type: "custom",
      render: (value) => (
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-4/10">
            <MessageSquare className="h-5 w-5 text-chart-4" />
          </div>
          <div className="flex-1 whitespace-pre-wrap rounded-md border p-3">{String(value || "—")}</div>
        </div>
      ),
    },
    {
      name: "status",
      label: "Trạng thái",
      type: "custom",
      render: (value) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-5/10">
            <AlertCircle className="h-5 w-5 text-chart-5" />
          </div>
          <Badge variant={statusColors[String(value)] || "default"}>{statusLabels[String(value)] || String(value)}</Badge>
        </div>
      ),
    },
    {
      name: "priority",
      label: "Độ ưu tiên",
      type: "custom",
      render: (value) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-6/10">
            <AlertCircle className="h-5 w-5 text-chart-6" />
          </div>
          <Badge variant={priorityColors[String(value)] || "default"}>{priorityLabels[String(value)] || String(value)}</Badge>
        </div>
      ),
    },
    {
      name: "isRead",
      label: "Đã đọc",
      type: "custom",
      render: (value) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-7/10">
            <MessageSquare className="h-5 w-5 text-chart-7" />
          </div>
          <Badge variant={value ? "outline" : "default"}>{value ? "Đã đọc" : "Chưa đọc"}</Badge>
        </div>
      ),
    },
    {
      name: "assignedTo",
      label: "Người được giao",
      type: "custom",
      render: (value) => {
        const assignedTo = value as ContactRequestDetailData["assignedTo"]
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-8/10">
              <UserCheck className="h-5 w-5 text-chart-8" />
            </div>
            <div className="font-medium">{assignedTo?.name || assignedTo?.email || "—"}</div>
          </div>
        )
      },
    },
    {
      name: "createdAt",
      label: "Ngày tạo",
      type: "custom",
      render: (value) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-9/10">
            <Calendar className="h-5 w-5 text-chart-9" />
          </div>
          <div>
            <div className="font-medium">{value ? formatDateVi(String(value)) : "—"}</div>
          </div>
        </div>
      ),
    },
    {
      name: "updatedAt",
      label: "Cập nhật lần cuối",
      type: "custom",
      render: (value) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-10/10">
            <Clock className="h-5 w-5 text-chart-10" />
          </div>
          <div>
            <div className="font-medium">{value ? formatDateVi(String(value)) : "—"}</div>
          </div>
        </div>
      ),
    },
  ]

  return (
    <ResourceDetailPage<ContactRequestDetailData>
      data={contactRequest}
      fields={detailFields}
      title={contactRequest.subject}
      description={`Yêu cầu liên hệ từ ${contactRequest.name}`}
      backUrl={backUrl}
      backLabel="Quay lại danh sách"
      actions={
        <Button
          variant="outline"
          onClick={() => router.push(`/admin/contact-requests/${contactRequestId}/edit`)}
          className="gap-2"
        >
          <Edit className="h-4 w-4" />
          Chỉnh sửa
        </Button>
      }
    />
  )
}

