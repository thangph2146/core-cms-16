"use client"

import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import { User, Mail, Hash, Calendar, Clock, CheckCircle2, XCircle, Edit } from "lucide-react"
import { 
  ResourceDetailClient, 
  FieldItem,
  type ResourceDetailField, 
  type ResourceDetailSection 
} from "@/features/admin/resources/components"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useResourceNavigation, useResourceDetailData, useResourceDetailLogger } from "@/features/admin/resources/hooks"
import { useResourceRouter } from "@/hooks/use-resource-segment"
import { queryKeys } from "@/lib/query-keys"
import { formatDateVi } from "../utils"
import { cn } from "@/lib/utils"
import { usePermissions } from "@/hooks/use-permissions"
import { PERMISSIONS } from "@/lib/permissions"

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
  const { hasAnyPermission } = usePermissions()
  
  // Check permission for edit
  const canUpdate = hasAnyPermission([PERMISSIONS.STUDENTS_UPDATE, PERMISSIONS.STUDENTS_MANAGE])

  const { data: detailData, isFetched, isFromApi, fetchedData } = useResourceDetailData({
    initialData: student,
    resourceId: studentId,
    detailQueryKey: queryKeys.adminStudents.detail,
    resourceName: "students",
    fetchOnMount: true,
  })

  useResourceDetailLogger({
    resourceName: "students",
    resourceId: studentId,
    data: detailData,
    isFetched,
    isFromApi,
    fetchedData,
  })

  const detailFields: ResourceDetailField<StudentDetailData>[] = []

  const detailSections: ResourceDetailSection<StudentDetailData>[] = [
    {
      id: "basic",
      title: "Thông tin cơ bản",
      description: "Thông tin chính về học sinh",
      fieldsContent: (_fields, data) => {
        const studentData = (data || detailData) as StudentDetailData
        
        return (
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2">
            {/* Student Code & Name */}
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

            {/* Email */}
            {studentData.email && (
              <FieldItem icon={Mail} label="Email">
                <a
                  href={`mailto:${studentData.email}`}
                  className="text-sm font-medium text-primary hover:underline truncate block transition-colors"
                >
                  {studentData.email}
                </a>
              </FieldItem>
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
            <FieldItem 
              icon={studentData.isActive ? CheckCircle2 : XCircle} 
              label="Trạng thái"
            >
              <Badge
                className={cn(
                  "text-sm font-medium px-2.5 py-1",
                  studentData.isActive
                    ? "bg-green-500/10 hover:bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/20"
                    : "bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/20"
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
            </FieldItem>

            {/* Timestamps */}
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2">
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

  const isDeleted = detailData.deletedAt !== null && detailData.deletedAt !== undefined

  return (
    <ResourceDetailClient<StudentDetailData>
      data={detailData}
      fields={detailFields}
      detailSections={detailSections}
      title={detailData.name || detailData.studentCode}
      description={`Chi tiết học sinh ${detailData.studentCode}`}
      backUrl={backUrl}
      onBack={() => navigateBack(backUrl)}
      actions={
        !isDeleted && canUpdate ? (
          <Button
            variant="outline"
            onClick={() => router.push(`/admin/students/${studentId}/edit`)}
            className="gap-2"
          >
            <Edit className="h-4 w-4" />
            Chỉnh sửa
          </Button>
        ) : null
      }
    />
  )
}
