"use client"

import * as React from "react"
import { User, Mail, Hash, Calendar, Clock, CheckCircle2, XCircle, Edit } from "lucide-react"
import { ResourceDetailPage, type ResourceDetailField, type ResourceDetailSection } from "@/features/admin/resources/components"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useResourceRouter } from "@/hooks/use-resource-segment"
import { formatDateVi } from "../utils"
import { cn } from "@/lib/utils"

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

export function StudentDetailClient({ studentId, student, backUrl = "/admin/students" }: StudentDetailClientProps) {
  const router = useResourceRouter()

  const detailFields: ResourceDetailField<StudentDetailData>[] = []

  const detailSections: ResourceDetailSection<StudentDetailData>[] = [
    {
      id: "basic",
      title: "Thông tin cơ bản",
      description: "Thông tin chính về học sinh",
      fieldsContent: (_fields, data) => {
        const studentData = data as StudentDetailData
        
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
        const studentData = data as StudentDetailData
        
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
      data={student}
      fields={detailFields}
      detailSections={detailSections}
      title={student.name || student.studentCode}
      description={`Chi tiết học sinh ${student.studentCode}`}
      backUrl={backUrl}
      backLabel="Quay lại danh sách"
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

