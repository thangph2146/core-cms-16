"use client"

import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import { User, Mail, Hash, Calendar, Clock, CheckCircle2, XCircle, Edit } from "lucide-react"
import { 
  ResourceDetailPage, 
  FieldItem,
  type ResourceDetailField, 
  type ResourceDetailSection 
} from "@/features/admin/resources/components"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useResourceNavigation, useResourceDetailData } from "@/features/admin/resources/hooks"
import { useResourceRouter } from "@/hooks/use-resource-segment"
import { queryKeys } from "@/lib/query-keys"
import { formatDateVi } from "../utils"
import { cn } from "@/lib/utils"
import { resourceLogger } from "@/lib/config"

export interface StudentDetailData {
  id: string
  userId: string | null
  name: string | null
  email: string | null
  studentCode: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  userName: string | null
  userEmail: string | null
  [key: string]: unknown
}

export interface StudentDetailClientProps {
  studentId: string
  student: StudentDetailData
  backUrl?: string
}

export function StudentDetailClient({ studentId, student, backUrl = "/admin/students" }: StudentDetailClientProps) {
  const queryClient = useQueryClient()
  const router = useResourceRouter()
  const { navigateBack } = useResourceNavigation({
    queryClient,
    invalidateQueryKey: queryKeys.adminStudents.all(),
  })

  // useRef để track logged state (tránh duplicate logs trong React Strict Mode)
  const loggedDataKeyRef = React.useRef<string | null>(null)

  // Ưu tiên sử dụng React Query cache nếu có (dữ liệu mới nhất sau khi edit), fallback về props
  // Chỉ log sau khi fetch từ API xong để đảm bảo data mới nhất
  const { data: detailData, isFetched, isFromApi, fetchedData } = useResourceDetailData({
    initialData: student,
    resourceId: studentId,
    detailQueryKey: queryKeys.adminStudents.detail,
    resourceName: "students",
    fetchOnMount: true, // Luôn fetch khi mount để đảm bảo data fresh
  })

  // Log detail action và data structure (chỉ log sau khi fetch từ API xong)
  // Sử dụng fetchedData (data từ API) thay vì detailData để đảm bảo log data mới nhất
  React.useEffect(() => {
    // Chỉ log khi đã fetch xong, data từ API (isFromApi = true), và có fetchedData
    if (!isFetched || !isFromApi || !fetchedData) return
    
    // Tạo unique key từ data để đảm bảo chỉ log khi data thực sự thay đổi
    const dataKey = `${studentId}-${fetchedData.updatedAt || fetchedData.createdAt || ""}`
    
    // Nếu đã log cho data key này rồi, skip
    if (loggedDataKeyRef.current === dataKey) return
    
    // Mark as logged
    loggedDataKeyRef.current = dataKey

    resourceLogger.detailAction({
      resource: "students",
      action: "load-detail",
      resourceId: studentId,
      recordData: fetchedData as Record<string, unknown>,
    })

    resourceLogger.dataStructure({
      resource: "students",
      dataType: "detail",
      structure: {
        fields: fetchedData as Record<string, unknown>,
      },
    })
  }, [studentId, isFetched, isFromApi, fetchedData?.id, fetchedData?.updatedAt, fetchedData?.createdAt])

  const detailFields: ResourceDetailField<StudentDetailData>[] = []

  const detailSections: ResourceDetailSection<StudentDetailData>[] = [
    {
      id: "basic",
      title: "Thông tin cơ bản",
      description: "Thông tin chính về học sinh",
      fieldsContent: (_fields, data) => {
        const studentData = (data || detailData) as StudentDetailData
        
        return (
          <div className="space-y-6">
            {/* Student Code & Name */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldItem icon={Hash} label="Mã học sinh">
                <div className="text-sm font-medium text-foreground font-mono">
                  {studentData.studentCode || "—"}
                </div>
              </FieldItem>

              <FieldItem icon={User} label="Tên học sinh">
                <div className="text-sm font-medium text-foreground">
                  {studentData.name || "—"}
                </div>
              </FieldItem>
            </div>

            <Separator />

            {/* Email */}
            {studentData.email && (
              <>
                <FieldItem icon={Mail} label="Email">
                  <a
                    href={`mailto:${studentData.email}`}
                    className="text-sm font-medium text-primary hover:underline truncate block transition-colors"
                  >
                    {studentData.email}
                  </a>
                </FieldItem>
                <Separator />
              </>
            )}

            {/* Linked Account */}
            {studentData.userId && studentData.userName && (
              <FieldItem icon={User} label="Tài khoản liên kết">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium text-foreground">
                    {studentData.userName}
                  </div>
                  {studentData.userEmail && (
                    <div className="text-xs text-muted-foreground">
                      {studentData.userEmail}
                    </div>
                  )}
                </div>
              </FieldItem>
            )}
          </div>
        )
      },
    },
    {
      id: "status",
      title: "Trạng thái và thời gian",
      description: "Trạng thái hoạt động và thông tin thời gian",
      fieldsContent: (_fields, data) => {
        const studentData = (data || detailData) as StudentDetailData
        
        return (
          <div className="space-y-6">
            {/* Status */}
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                {studentData.isActive ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-muted-foreground mb-1.5">Trạng thái</div>
                <Badge
                  className={cn(
                    "text-sm font-medium px-2.5 py-1",
                    studentData.isActive
                      ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20"
                      : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                  )}
                  variant={studentData.isActive ? "default" : "secondary"}
                >
                  {studentData.isActive ? (
                    <>
                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                      Hoạt động
                    </>
                  ) : (
                    <>
                      <XCircle className="mr-1.5 h-3.5 w-3.5" />
                      Tạm khóa
                    </>
                  )}
                </Badge>
              </div>
            </div>

            <Separator />

            {/* Timestamps */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldItem icon={Calendar} label="Ngày tạo">
                <div className="text-sm font-medium text-foreground">
                  {studentData.createdAt ? formatDateVi(studentData.createdAt) : "—"}
                </div>
              </FieldItem>

              <FieldItem icon={Clock} label="Cập nhật lần cuối">
                <div className="text-sm font-medium text-foreground">
                  {studentData.updatedAt ? formatDateVi(studentData.updatedAt) : "—"}
                </div>
              </FieldItem>
            </div>
          </div>
        )
      },
    },
  ]

  return (
    <ResourceDetailPage<StudentDetailData>
      data={detailData}
      fields={detailFields}
      detailSections={detailSections}
      title={detailData.name || detailData.studentCode}
      description={`Chi tiết học sinh ${detailData.studentCode}`}
      backUrl={backUrl}
      onBack={() => navigateBack(backUrl)}
      actions={
        <Button
          variant="outline"
          onClick={() => router.push(`/admin/students/${studentId}/edit`)}
          className="gap-2"
        >
          <Edit className="h-4 w-4" />
          Chỉnh sửa
        </Button>
      }
    />
  )
}
