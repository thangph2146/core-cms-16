/**
 * Client Component: Student Edit Form
 * 
 * Handles form interactions, validation, và API calls
 * Pattern: Server Component → Client Component (UI/interactions)
 */

"use client"

import { useQueryClient } from "@tanstack/react-query"
import { ResourceForm } from "@/features/admin/resources/components"
import { useResourceFormSubmit, useResourceNavigation } from "@/features/admin/resources/hooks"
import { apiRoutes } from "@/lib/api/routes"
import { queryKeys } from "@/lib/query-keys"
import { logger } from "@/lib/config"
import { getBaseStudentFields, getStudentFormSections, type StudentFormData } from "../form-fields"
import type { StudentRow } from "../types"

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
  student,
  open = true,
  onOpenChange,
  onSuccess,
  variant = "dialog",
  backUrl,
  backLabel = "Quay lại",
  studentId: _studentId,
  users: usersFromServer = [],
  isSuperAdmin = false,
}: StudentEditClientProps) {
  const queryClient = useQueryClient()
  const { navigateBack } = useResourceNavigation({
    queryClient,
    invalidateQueryKey: queryKeys.adminStudents.all(),
  })

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
      logger.debug("[StudentEditClient] transformData START", { 
        studentId: student?.id,
        originalData: data,
        isSuperAdmin,
      })
      
      const submitData = { ...data }
      // Nếu không phải super admin, không cho phép thay đổi userId
      if (!isSuperAdmin && student) {
        submitData.userId = student.userId
        logger.debug("[StudentEditClient] Preserving userId (not super admin)", { 
          userId: student.userId 
        })
      }
      
      logger.debug("[StudentEditClient] transformData END", { 
        transformedData: submitData 
      })
      
      return submitData
    },
    onSuccess: async (response) => {
      const targetStudentId = student?.id
      
      logger.debug("[StudentEditClient] onSuccess START", { 
        studentId: targetStudentId,
        responseStatus: response?.status,
        responseData: response?.data,
        // Log updated student data từ response
        updatedStudent: response?.data?.data ? {
          id: response.data.data.id,
          name: response.data.data.name,
          email: response.data.data.email,
          studentCode: response.data.data.studentCode,
          isActive: response.data.data.isActive,
          userId: response.data.data.userId,
        } : undefined,
      })
      
      // Invalidate React Query cache để cập nhật danh sách students
      logger.debug("[StudentEditClient] Invalidating all students queries")
      await queryClient.invalidateQueries({ queryKey: queryKeys.adminStudents.all(), refetchType: "all" })
      logger.debug("[StudentEditClient] All students queries invalidated")
      
      // Invalidate detail query nếu có studentId
      if (targetStudentId) {
        logger.debug("[StudentEditClient] Invalidating detail query", { studentId: targetStudentId })
        await queryClient.invalidateQueries({ queryKey: queryKeys.adminStudents.detail(targetStudentId) })
        logger.debug("[StudentEditClient] Detail query invalidated")
      }
      
      // Refetch để đảm bảo data mới nhất
      logger.debug("[StudentEditClient] Refetching all students queries")
      const refetchResult = await queryClient.refetchQueries({ queryKey: queryKeys.adminStudents.all(), type: "all" })
      
      // Log refetch results
      if (Array.isArray(refetchResult)) {
        logger.debug("[StudentEditClient] All students queries refetched", {
          refetchedCount: refetchResult.length,
          // Log data từ refetched queries để verify
          refetchedQueries: refetchResult.map((result: { status?: string; dataUpdatedAt?: number; data?: unknown }, index: number) => ({
            index,
            status: result.status,
            dataUpdatedAt: result.dataUpdatedAt,
            // Log sample data nếu có
            sampleData: result.data && typeof result.data === 'object' && result.data !== null && 'rows' in result.data
              ? {
                  rowsCount: (result.data as { rows: unknown[] }).rows.length,
                  total: 'total' in result.data ? (result.data as { total: number }).total : undefined,
                  sampleRows: (result.data as { rows: StudentRow[] }).rows.slice(0, 2).map((r: StudentRow) => ({
                    id: r.id,
                    name: r.name,
                    studentCode: r.studentCode,
                  })),
                }
              : undefined,
          })),
        })
      } else {
        logger.debug("[StudentEditClient] All students queries refetched", {
          refetchedResult: refetchResult,
        })
      }
      
      logger.debug("[StudentEditClient] onSuccess END", { studentId: targetStudentId })
      
      if (onSuccess) {
        onSuccess()
      }
    },
  })

  if (!student?.id) {
    return null
  }

  const editFields = getBaseStudentFields(usersFromServer, isSuperAdmin)
  const formSections = getStudentFormSections()

  return (
    <ResourceForm<StudentFormData>
      data={student}
      fields={editFields}
      sections={formSections}
      onSubmit={handleSubmit}
      title="Chỉnh sửa học sinh"
      description="Cập nhật thông tin học sinh"
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
    />
  )
}

