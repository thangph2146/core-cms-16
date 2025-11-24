/**
 * Custom hook để xử lý các actions của students
 * Sử dụng useResourceActions dùng chung cho delete/restore/hard-delete
 * Giữ lại handleToggleStatus riêng vì là logic đặc biệt
 */

import { useCallback, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/axios"
import { apiRoutes } from "@/lib/api/routes"
import { queryKeys } from "@/lib/query-keys"
import { useResourceActions } from "@/features/admin/resources/hooks"
import type { ResourceRefreshHandler } from "@/features/admin/resources/types"
import type { StudentRow } from "../types"
import type { FeedbackVariant } from "@/components/dialogs"
import { STUDENT_MESSAGES } from "../constants/messages"
import { resourceLogger } from "@/lib/config"

interface UseStudentActionsOptions {
  canDelete: boolean
  canRestore: boolean
  canManage: boolean
  isSocketConnected?: boolean
  showFeedback: (variant: FeedbackVariant, title: string, description?: string, details?: string) => void
}

export function useStudentActions({
  canDelete,
  canRestore,
  canManage,
  isSocketConnected,
  showFeedback,
}: UseStudentActionsOptions) {
  const queryClient = useQueryClient()
  const [togglingStudents, setTogglingStudents] = useState<Set<string>>(new Set())

  // Sử dụng hook dùng chung cho delete/restore/hard-delete
  const {
    executeSingleAction,
    executeBulkAction,
    deletingIds: deletingStudents,
    restoringIds: restoringStudents,
    hardDeletingIds: hardDeletingStudents,
    bulkState,
  } = useResourceActions<StudentRow>({
    resourceName: "students",
    queryKeys: {
      all: () => queryKeys.adminStudents.all(),
    },
    apiRoutes: {
      delete: (id) => apiRoutes.students.delete(id),
      restore: (id) => apiRoutes.students.restore(id),
      hardDelete: (id) => apiRoutes.students.hardDelete(id),
      bulk: apiRoutes.students.bulk,
    },
    messages: STUDENT_MESSAGES,
    getRecordName: (row) => row.studentCode,
    permissions: {
      canDelete,
      canRestore,
      canManage,
    },
    showFeedback,
    isSocketConnected,
    getLogMetadata: (row) => ({
      studentId: row.id,
      studentCode: row.studentCode,
    }),
  })

  // Giữ lại handleToggleStatus riêng vì là logic đặc biệt
  const handleToggleStatus = useCallback(
    async (row: StudentRow, newStatus: boolean, _refresh: ResourceRefreshHandler) => {
      if (!canManage) {
        showFeedback("error", STUDENT_MESSAGES.NO_PERMISSION, STUDENT_MESSAGES.NO_MANAGE_PERMISSION)
        return
      }

      resourceLogger.tableAction({
        resource: "students",
        action: newStatus ? "restore" : "delete",
        studentId: row.id,
        studentCode: row.studentCode,
      })

      setTogglingStudents((prev) => new Set(prev).add(row.id))

      try {
        await apiClient.put(apiRoutes.students.update(row.id), {
          isActive: newStatus,
        })

        showFeedback(
          "success",
          STUDENT_MESSAGES.TOGGLE_ACTIVE_SUCCESS,
          `Đã ${newStatus ? "kích hoạt" : "vô hiệu hóa"} học sinh ${row.studentCode}`
        )
        
        // Invalidate và refetch queries - Next.js 16 pattern: đảm bảo data fresh
        await queryClient.invalidateQueries({ queryKey: queryKeys.adminStudents.all(), refetchType: "active" })
        await queryClient.refetchQueries({ queryKey: queryKeys.adminStudents.all(), type: "active" })
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : STUDENT_MESSAGES.UNKNOWN_ERROR
        showFeedback(
          "error",
          STUDENT_MESSAGES.TOGGLE_ACTIVE_ERROR,
          `Không thể ${newStatus ? "kích hoạt" : "vô hiệu hóa"} học sinh`,
          errorMessage
        )
      } finally {
        setTogglingStudents((prev) => {
          const next = new Set(prev)
          next.delete(row.id)
          return next
        })
      }
    },
    [canManage, showFeedback, queryClient],
  )

  return {
    handleToggleStatus,
    executeSingleAction,
    executeBulkAction,
    togglingStudents,
    deletingStudents,
    restoringStudents,
    hardDeletingStudents,
    bulkState,
  }
}
