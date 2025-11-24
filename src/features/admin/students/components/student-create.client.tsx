/**
 * Client Component: Student Create Form
 * 
 * Handles form interactions, validation, và API calls
 * Pattern: Server Component → Client Component (UI/interactions)
 */

"use client"

import { ResourceForm } from "@/features/admin/resources/components"
import { useResourceFormSubmit } from "@/features/admin/resources/hooks"
import { apiRoutes } from "@/lib/api/routes"
import { getBaseStudentFields, getStudentFormSections, type StudentFormData } from "../form-fields"

export interface StudentCreateClientProps {
  backUrl?: string
  users?: Array<{ label: string; value: string }>
  isSuperAdmin?: boolean
}

export function StudentCreateClient({ 
  backUrl = "/admin/students", 
  users: usersFromServer = [],
  isSuperAdmin = false,
}: StudentCreateClientProps) {
  const { handleSubmit } = useResourceFormSubmit({
    apiRoute: apiRoutes.students.create,
    method: "POST",
    messages: {
      successTitle: "Tạo học sinh thành công",
      successDescription: "Học sinh mới đã được tạo thành công.",
      errorTitle: "Lỗi tạo học sinh",
    },
    navigation: {
      toDetail: (response) =>
        response.data?.data?.id ? `/admin/students/${response.data.data.id}` : backUrl,
      fallback: backUrl,
    },
    transformData: (data) => {
      const submitData = { ...data }
      // Nếu không phải super admin, không gửi userId (server sẽ tự động set userId = actorId)
      if (!isSuperAdmin) {
        delete submitData.userId
      }
      return submitData
    },
  })

  const createFields = getBaseStudentFields(usersFromServer, isSuperAdmin)
  const formSections = getStudentFormSections()

  return (
    <ResourceForm<StudentFormData>
      data={null}
      fields={createFields}
      sections={formSections}
      onSubmit={handleSubmit}
      title="Tạo học sinh mới"
      description="Nhập thông tin để tạo học sinh mới"
      submitLabel="Tạo học sinh"
      cancelLabel="Hủy"
      backUrl={backUrl}
      backLabel="Quay lại danh sách"
      variant="page"
      showCard={false}
      className="max-w-[100%]"
      resourceName="students"
      action="create"
    />
  )
}

