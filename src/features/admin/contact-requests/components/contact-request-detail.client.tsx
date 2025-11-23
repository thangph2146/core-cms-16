"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import { User, Mail, Phone, FileText, MessageSquare, AlertCircle, UserCheck, Calendar, Clock, Edit, CheckCircle2, XCircle } from "lucide-react"
import { 
  ResourceDetailPage, 
  FieldItem,
  type ResourceDetailField, 
  type ResourceDetailSection 
} from "@/features/admin/resources/components"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useResourceRouter } from "@/hooks/use-resource-segment"
import { useResourceDetailData } from "@/features/admin/resources/hooks"
import { queryKeys } from "@/lib/query-keys"
import { resourceLogger } from "@/lib/config"
import { formatDateVi } from "../utils"
import { cn } from "@/lib/utils"

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
  const router = useResourceRouter()

  // useRef để track logged state (tránh duplicate logs trong React Strict Mode)
  const loggedDataKeyRef = useRef<string | null>(null)

  // Fetch fresh data từ API để đảm bảo data chính xác (theo chuẩn Next.js 16)
  // Luôn fetch khi mount để đảm bảo data mới nhất từ API
  const { data: detailData, isFetched, isFromApi, fetchedData } = useResourceDetailData({
    initialData: contactRequest,
    resourceId: contactRequestId,
    detailQueryKey: queryKeys.adminContactRequests.detail,
    resourceName: "contact-requests",
    fetchOnMount: true, // Luôn fetch khi mount để đảm bảo data fresh
  })

  // Log detail action và data structure (chỉ log một lần sau khi fetch từ API xong)
  // Sử dụng fetchedData (data từ API) thay vì detailData để đảm bảo log data mới nhất
  useEffect(() => {
    // Chỉ log khi đã fetch xong, data từ API (isFromApi = true), và có fetchedData
    if (!isFetched || !isFromApi || !fetchedData) return
    
    // Tạo unique key từ data để đảm bảo chỉ log khi data thực sự thay đổi
    const dataKey = `${contactRequestId}-${fetchedData.updatedAt || fetchedData.createdAt || ""}`
    
    // Nếu đã log cho data key này rồi, skip
    if (loggedDataKeyRef.current === dataKey) return
    
    // Mark as logged
    loggedDataKeyRef.current = dataKey
    
    resourceLogger.detailAction({
      resource: "contact-requests",
      action: "load-detail",
      resourceId: contactRequestId,
      recordData: fetchedData as Record<string, unknown>,
    })

    resourceLogger.dataStructure({
      resource: "contact-requests",
      dataType: "detail",
      structure: {
        fields: fetchedData as Record<string, unknown>,
      },
    })
  }, [contactRequestId, isFetched, isFromApi, fetchedData?.id, fetchedData?.updatedAt, fetchedData?.createdAt])

  const detailFields: ResourceDetailField<ContactRequestDetailData>[] = []

  const detailSections: ResourceDetailSection<ContactRequestDetailData>[] = [
    {
      id: "basic",
      title: "Thông tin cơ bản",
      description: "Thông tin liên hệ và nội dung yêu cầu",
      fieldsContent: (_fields, data) => {
        const requestData = data as ContactRequestDetailData
        
        return (
          <div className="space-y-6">
            {/* Contact Info */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldItem icon={User} label="Tên người liên hệ">
                <div className="text-sm font-medium text-foreground">
                  {requestData.name || "—"}
                </div>
              </FieldItem>

              <FieldItem icon={Mail} label="Email">
                <a
                  href={`mailto:${requestData.email}`}
                  className="text-sm font-medium text-primary hover:underline truncate block transition-colors"
                >
                  {requestData.email || "—"}
                </a>
              </FieldItem>
            </div>

            {requestData.phone && (
              <>
                <Separator />
                <FieldItem icon={Phone} label="Số điện thoại">
                  <a
                    href={`tel:${requestData.phone}`}
                    className="text-sm font-medium text-primary hover:underline transition-colors"
                  >
                    {requestData.phone}
                  </a>
                </FieldItem>
              </>
            )}

            <Separator />

            {/* Subject */}
            <FieldItem icon={FileText} label="Tiêu đề">
              <div className="text-sm font-medium text-foreground">
                {requestData.subject || "—"}
              </div>
            </FieldItem>

            <Separator />

            {/* Content */}
            <Card className="border border-border/50 bg-card p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-foreground mb-2">Nội dung</h3>
                  <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground break-words">
                    {requestData.content || "—"}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )
      },
    },
    {
      id: "status",
      title: "Trạng thái và phân công",
      description: "Trạng thái xử lý, độ ưu tiên và người được giao",
      fieldsContent: (_fields, data) => {
        const requestData = data as ContactRequestDetailData
        
        return (
          <div className="space-y-6">
            {/* Status & Priority */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldItem icon={AlertCircle} label="Trạng thái">
                <Badge variant={statusColors[requestData.status] || "default"}>
                  {statusLabels[requestData.status] || requestData.status}
                </Badge>
              </FieldItem>

              <FieldItem icon={AlertCircle} label="Độ ưu tiên">
                <Badge variant={priorityColors[requestData.priority] || "default"}>
                  {priorityLabels[requestData.priority] || requestData.priority}
                </Badge>
              </FieldItem>
            </div>

            <Separator />

            {/* Read Status */}
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                {requestData.isRead ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-muted-foreground mb-1.5">Đã đọc</div>
                <Badge
                  className={cn(
                    "text-sm font-medium px-2.5 py-1",
                    requestData.isRead
                      ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20"
                      : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                  )}
                  variant={requestData.isRead ? "default" : "secondary"}
                >
                  {requestData.isRead ? (
                    <>
                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                      Đã đọc
                    </>
                  ) : (
                    <>
                      <XCircle className="mr-1.5 h-3.5 w-3.5" />
                      Chưa đọc
                    </>
                  )}
                </Badge>
              </div>
            </div>

            {/* Assigned To */}
            {requestData.assignedTo && (
              <>
                <Separator />
                <FieldItem icon={UserCheck} label="Người được giao">
                  <div className="text-sm font-medium text-foreground">
                    {requestData.assignedTo.name || requestData.assignedTo.email || "—"}
                  </div>
                </FieldItem>
              </>
            )}
          </div>
        )
      },
    },
    {
      id: "timestamps",
      title: "Thông tin thời gian",
      description: "Ngày tạo và cập nhật lần cuối",
      fieldsContent: (_fields, data) => {
        const requestData = data as ContactRequestDetailData
        
        return (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldItem icon={Calendar} label="Ngày tạo">
                <div className="text-sm font-medium text-foreground">
                  {requestData.createdAt ? formatDateVi(requestData.createdAt) : "—"}
                </div>
              </FieldItem>

              <FieldItem icon={Clock} label="Cập nhật lần cuối">
                <div className="text-sm font-medium text-foreground">
                  {requestData.updatedAt ? formatDateVi(requestData.updatedAt) : "—"}
                </div>
              </FieldItem>
            </div>
          </div>
        )
      },
    },
  ]

  return (
    <ResourceDetailPage<ContactRequestDetailData>
      data={detailData}
      fields={detailFields}
      detailSections={detailSections}
      title={detailData.subject}
      description={`Yêu cầu liên hệ từ ${detailData.name}`}
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

