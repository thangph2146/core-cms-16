"use client"

import { useMemo } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { ResourceForm } from "@/features/admin/resources/components"
import { useResourceFormSubmit, useResourceNavigation, useResourceDetailData } from "@/features/admin/resources/hooks"
import { createResourceEditOnSuccess } from "@/features/admin/resources/utils"
import { apiRoutes } from "@/lib/api/routes"
import { queryKeys } from "@/lib/query-keys"
import { getBaseStudentFields, getStudentFormSections, type StudentFormData } from "../form-fields"
import { StudentRow } from "../types"

interface StudentEditData extends StudentRow {
  userId: string | null
  [key: string]: unknown
}

export interface StudentEditClientProps {
  student: StudentEditData | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
  variant?: "dialog" | "sheet" | "page"
  backUrl?: string
  backLabel?: string
  studentId?: string
  users?: Array<{ label: string; value: string }>
  isSuperAdmin?: boolean
}

export function StudentEditClient({
  student: initialStudent,
  open = true,
  onOpenChange,
  onSuccess,
  variant = "dialog",
  backUrl,
  backLabel = "Quay lại",
  studentId,
  users: usersFromServer = [],
  isSuperAdmin = false,
}: StudentEditClientProps) {
  const queryClient = useQueryClient()
  const { navigateBack } = useResourceNavigation({
    queryClient,
    invalidateQueryKey: queryKeys.adminStudents.all(),
  })

  const resourceId = studentId || initialStudent?.id
  const { data: studentData } = useResourceDetailData({
    initialData: initialStudent || ({} as StudentEditData),
    resourceId: resourceId || "",
    detailQueryKey: queryKeys.adminStudents.detail,
    resourceName: "students",
    fetchOnMount: !!resourceId,
  })
  const student = useMemo(() => {
    if (studentData) {
      return studentData as StudentEditData
    }
    return initialStudent || null
  }, [studentData, initialStudent])

  const { handleSubmit } = useResourceFormSubmit({
    apiRoute: (id) => apiRoutes.students.update(id),
    method: "PUT",
    resourceId: student?.id,
    messages: {
      successTitle: "Cập nhật học sinh thành công",
      successDescription: "Học sinh đã được cập nhật thành công.",
      errorTitle: "Lỗi cập nhật học sinh",
    },
    navigation: {
      toDetail: variant === "page" && backUrl
        ? backUrl
        : variant === "page" && student?.id
          ? `/admin/students/${student.id}`
          : undefined,
      fallback: backUrl,
    },
    transformData: (data) => {
      const submitData = { ...data }
      if (!isSuperAdmin && student) {
        submitData.userId = student.userId
      }
      return submitData
    },
    onSuccess: createResourceEditOnSuccess({
      queryClient,
      resourceId: student?.id,
      allQueryKey: queryKeys.adminStudents.all(),
      detailQueryKey: queryKeys.adminStudents.detail,
      resourceName: "students",
      getRecordName: (data) => (data.name as string | null) || (data.studentCode as string | undefined),
      onSuccess,
    }),
  })

  if (!student?.id) {
    return null
  }

  const isDeleted = student.deletedAt !== null && student.deletedAt !== undefined
  const formDisabled = isDeleted && variant !== "page"
  
  const handleSubmitWrapper = async (data: Partial<StudentFormData>) => {
    if (isDeleted) {
      return { success: false, error: "Bản ghi đã bị xóa, không thể chỉnh sửa" }
    }
    return handleSubmit(data)
  }

  const editFields = getBaseStudentFields(usersFromServer, isSuperAdmin)
  const formSections = getStudentFormSections()

  return (
    <ResourceForm<StudentFormData>
      data={student}
      fields={editFields.map(field => ({ ...field, disabled: formDisabled || field.disabled }))}
      sections={formSections}
      onSubmit={handleSubmitWrapper}
      title="Chỉnh sửa học sinh"
      description={isDeleted ? "Bản ghi đã bị xóa, không thể chỉnh sửa" : "Cập nhật thông tin học sinh"}
      submitLabel="Lưu thay đổi"
      cancelLabel="Hủy"
      backUrl={backUrl}
      backLabel={backLabel}
      onBack={() => navigateBack(backUrl || `/admin/students/${student?.id || ""}`)}
      variant={variant}
      open={open}
      onOpenChange={onOpenChange}
      showCard={variant === "page" ? false : true}
      className={variant === "page" ? "max-w-[100%]" : undefined}
      resourceName="students"
      resourceId={student?.id}
      action="update"
    />
  )
}

