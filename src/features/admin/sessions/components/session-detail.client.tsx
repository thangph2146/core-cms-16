"use client"

import { useEffect, useRef } from "react"
import { User, Globe, MapPin, Calendar, CheckCircle2, XCircle, Edit, Key, RefreshCw, Clock } from "lucide-react"
import { 
  ResourceDetailPage, 
  FieldItem,
  type ResourceDetailField, 
  type ResourceDetailSection 
} from "@/features/admin/resources/components"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useResourceRouter } from "@/hooks/use-resource-segment"
import { useResourceDetailData } from "@/features/admin/resources/hooks"
import { queryKeys } from "@/lib/query-keys"
import { resourceLogger } from "@/lib/config"
import { formatDateVi } from "../utils"
import { cn } from "@/lib/utils"

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
  const router = useResourceRouter()

  // useRef để track logged state (tránh duplicate logs trong React Strict Mode)
  const loggedDataKeyRef = useRef<string | null>(null)

  // Fetch fresh data từ API để đảm bảo data chính xác (theo chuẩn Next.js 16)
  // Luôn fetch khi mount để đảm bảo data mới nhất từ API
  const { data: detailData, isFetched, isFromApi, fetchedData } = useResourceDetailData({
    initialData: session,
    resourceId: sessionId,
    detailQueryKey: queryKeys.adminSessions.detail,
    resourceName: "sessions",
    fetchOnMount: true, // Luôn fetch khi mount để đảm bảo data fresh
  })

  // Log detail action và data structure (chỉ log một lần sau khi fetch từ API xong)
  // Sử dụng fetchedData (data từ API) thay vì detailData để đảm bảo log data mới nhất
  useEffect(() => {
    // Chỉ log khi đã fetch xong, data từ API (isFromApi = true), và có fetchedData
    if (!isFetched || !isFromApi || !fetchedData) return
    
    // Tạo unique key từ data để đảm bảo chỉ log khi data thực sự thay đổi
    const dataKey = `${sessionId}-${fetchedData.updatedAt || fetchedData.createdAt || ""}`
    
    // Nếu đã log cho data key này rồi, skip
    if (loggedDataKeyRef.current === dataKey) return
    
    // Mark as logged
    loggedDataKeyRef.current = dataKey
    
    resourceLogger.detailAction({
      resource: "sessions",
      action: "load-detail",
      resourceId: sessionId,
      recordData: fetchedData as Record<string, unknown>,
    })

    resourceLogger.dataStructure({
      resource: "sessions",
      dataType: "detail",
      structure: {
        fields: fetchedData as Record<string, unknown>,
      },
    })
  }, [sessionId, isFetched, isFromApi, fetchedData?.id, fetchedData?.updatedAt, fetchedData?.createdAt])

  const detailFields: ResourceDetailField<SessionDetailData>[] = []

  const detailSections: ResourceDetailSection<SessionDetailData>[] = [
    {
      id: "basic",
      title: "Thông tin cơ bản",
      description: "Thông tin chính về session",
      fieldsContent: (_fields, data) => {
        const sessionData = data as SessionDetailData
        
        return (
          <div className="space-y-6">
            <FieldItem icon={User} label="Người dùng" iconColor="bg-primary/10">
              <div>
                <div className="text-sm font-medium text-foreground">
                  {sessionData.userName || sessionData.userEmail || "—"}
                </div>
                {sessionData.userEmail && sessionData.userName && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {sessionData.userEmail}
                  </div>
                )}
              </div>
            </FieldItem>
          </div>
        )
      },
    },
    {
      id: "security",
      title: "Bảo mật",
      description: "Thông tin bảo mật và mạng",
      fieldsContent: (_fields, data) => {
        const sessionData = data as SessionDetailData
        
        return (
          <div className="space-y-6">
            <FieldItem icon={Key} label="Access Token" iconColor="bg-chart-1/10">
              <div className="font-mono text-xs break-all text-foreground">
                {sessionData.accessToken || "—"}
              </div>
            </FieldItem>

            <Separator />

            <FieldItem icon={RefreshCw} label="Refresh Token" iconColor="bg-chart-2/10">
              <div className="font-mono text-xs break-all text-foreground">
                {sessionData.refreshToken || "—"}
              </div>
            </FieldItem>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <FieldItem icon={Globe} label="User Agent" iconColor="bg-chart-3/10">
                <div className="text-sm break-all text-foreground">
                  {sessionData.userAgent || "—"}
                </div>
              </FieldItem>

              <FieldItem icon={MapPin} label="IP Address" iconColor="bg-chart-4/10">
                <div className="text-sm font-medium text-foreground">
                  {sessionData.ipAddress || "—"}
                </div>
              </FieldItem>
            </div>
          </div>
        )
      },
    },
    {
      id: "status",
      title: "Trạng thái và thời gian",
      description: "Trạng thái hoạt động và thông tin thời gian",
      fieldsContent: (_fields, data) => {
        const sessionData = data as SessionDetailData
        
        return (
          <div className="space-y-6">
            <FieldItem 
              icon={sessionData.isActive ? CheckCircle2 : XCircle} 
              label="Trạng thái"
              iconColor={sessionData.isActive ? "bg-green-500/10" : "bg-red-500/10"}
            >
              <Badge 
                variant={sessionData.isActive ? "default" : "secondary"}
                className={cn(
                  sessionData.isActive
                    ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20"
                    : "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20"
                )}
              >
                {sessionData.isActive ? "Hoạt động" : "Tạm khóa"}
              </Badge>
            </FieldItem>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <FieldItem icon={Calendar} label="Thời gian hết hạn">
                <div className="text-sm font-medium text-foreground">
                  {sessionData.expiresAt ? formatDateVi(sessionData.expiresAt) : "—"}
                </div>
              </FieldItem>

              <FieldItem icon={Clock} label="Hoạt động cuối">
                <div className="text-sm font-medium text-foreground">
                  {sessionData.lastActivity ? formatDateVi(sessionData.lastActivity) : "—"}
                </div>
              </FieldItem>

              <FieldItem icon={Calendar} label="Ngày tạo">
                <div className="text-sm font-medium text-foreground">
                  {sessionData.createdAt ? formatDateVi(sessionData.createdAt) : "—"}
                </div>
              </FieldItem>
            </div>
          </div>
        )
      },
    },
  ]

  return (
    <ResourceDetailPage<SessionDetailData>
      data={detailData}
      fields={detailFields}
      detailSections={detailSections}
      title={`Session ${detailData.userName || detailData.userEmail || detailData.id}`}
      description={`Chi tiết phiên đăng nhập của ${session.userName || session.userEmail || "người dùng"}`}
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

