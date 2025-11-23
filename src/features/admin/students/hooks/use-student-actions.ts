/**
 * Custom hook để xử lý các actions của students
 * Tách logic xử lý actions ra khỏi component chính để code sạch hơn
 */

import { useCallback, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/axios"
import { apiRoutes } from "@/lib/api/routes"
import { queryKeys } from "@/lib/query-keys"
import { useResourceBulkProcessing } from "@/features/admin/resources/hooks"
import type { ResourceRefreshHandler, BulkActionResult } from "@/features/admin/resources/types"
import type { StudentRow } from "../types"
import type { DataTableResult } from "@/components/tables"
import type { FeedbackVariant } from "@/components/dialogs"
import { STUDENT_MESSAGES } from "../constants/messages"
import { resourceLogger } from "@/lib/config"

interface UseStudentActionsOptions {
  canDelete: boolean
  canRestore: boolean
  canManage: boolean
  isSocketConnected: boolean
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
  const [deletingStudents, setDeletingStudents] = useState<Set<string>>(new Set())
  const [restoringStudents, setRestoringStudents] = useState<Set<string>>(new Set())
  const [hardDeletingStudents, setHardDeletingStudents] = useState<Set<string>>(new Set())

  const { bulkState, startBulkProcessing, stopBulkProcessing } = useResourceBulkProcessing()

  const handleToggleStatus = useCallback(
    async (row: StudentRow, newStatus: boolean, refresh: ResourceRefreshHandler) => {
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
    [canManage, isSocketConnected, showFeedback, queryClient],
  )

  const executeSingleAction = useCallback(
    async (
      action: "delete" | "restore" | "hard-delete",
      row: StudentRow,
      refresh: ResourceRefreshHandler
    ): Promise<void> => {
      const actionConfig = {
        delete: {
          permission: canDelete,
          endpoint: apiRoutes.students.delete(row.id),
          method: "delete" as const,
          successTitle: STUDENT_MESSAGES.DELETE_SUCCESS,
          successDescription: `Đã xóa học sinh ${row.studentCode}`,
          errorTitle: STUDENT_MESSAGES.DELETE_ERROR,
          errorDescription: `Không thể xóa học sinh ${row.studentCode}`,
        },
        restore: {
          permission: canRestore,
          endpoint: apiRoutes.students.restore(row.id),
          method: "post" as const,
          successTitle: STUDENT_MESSAGES.RESTORE_SUCCESS,
          successDescription: `Đã khôi phục học sinh ${row.studentCode}`,
          errorTitle: STUDENT_MESSAGES.RESTORE_ERROR,
          errorDescription: `Không thể khôi phục học sinh ${row.studentCode}`,
        },
        "hard-delete": {
          permission: canManage,
          endpoint: apiRoutes.students.hardDelete(row.id),
          method: "delete" as const,
          successTitle: STUDENT_MESSAGES.HARD_DELETE_SUCCESS,
          successDescription: `Đã xóa vĩnh viễn học sinh ${row.studentCode}`,
          errorTitle: STUDENT_MESSAGES.HARD_DELETE_ERROR,
          errorDescription: `Không thể xóa vĩnh viễn học sinh ${row.studentCode}`,
        },
      }[action]

      if (!actionConfig.permission) {
        return
      }

      resourceLogger.tableAction({
        resource: "students",
        action,
        studentId: row.id,
        studentCode: row.studentCode,
      })

      // Track loading state
      const setLoadingState = action === "delete"
        ? setDeletingStudents
        : action === "restore"
        ? setRestoringStudents
        : setHardDeletingStudents

      setLoadingState((prev) => new Set(prev).add(row.id))

      try {
        if (actionConfig.method === "delete") {
          await apiClient.delete(actionConfig.endpoint)
        } else {
          await apiClient.post(actionConfig.endpoint)
        }
        
        showFeedback("success", actionConfig.successTitle, actionConfig.successDescription)
        
        // Invalidate và refetch queries - Next.js 16 pattern: đảm bảo data fresh
        // Đảm bảo table và detail luôn hiển thị data mới sau mutations
        await queryClient.invalidateQueries({ queryKey: queryKeys.adminStudents.all(), refetchType: "active" })
        await queryClient.refetchQueries({ queryKey: queryKeys.adminStudents.all(), type: "active" })
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : STUDENT_MESSAGES.UNKNOWN_ERROR
        showFeedback("error", actionConfig.errorTitle, actionConfig.errorDescription, errorMessage)
        if (action === "restore") {
          // Don't throw for restore to allow UI to continue
        } else {
          throw error
        }
      } finally {
        setLoadingState((prev) => {
          const next = new Set(prev)
          next.delete(row.id)
          return next
        })
      }
    },
    [canDelete, canRestore, canManage, isSocketConnected, showFeedback],
  )

  const executeBulkAction = useCallback(
    async (
      action: "delete" | "restore" | "hard-delete",
      ids: string[],
      refresh: ResourceRefreshHandler,
      clearSelection: () => void
    ) => {
      if (ids.length === 0) return
      if (!startBulkProcessing()) return

      try {
        resourceLogger.tableAction({
          resource: "students",
          action: `bulk-${action}`,
          count: ids.length,
          studentIds: ids,
        })

        const response = await apiClient.post<BulkActionResult>(apiRoutes.students.bulk, { action, ids })

        // Hiển thị feedback với title và description
        const successTitles = {
          restore: STUDENT_MESSAGES.BULK_RESTORE_SUCCESS,
          delete: STUDENT_MESSAGES.BULK_DELETE_SUCCESS,
          "hard-delete": STUDENT_MESSAGES.BULK_HARD_DELETE_SUCCESS,
        }
        const title = successTitles[action]
        const description = response.data.message || `Đã thực hiện thao tác cho ${ids.length} học sinh`
        
        showFeedback("success", title, description)
        clearSelection()

        // Invalidate và refetch queries - Next.js 16 pattern: đảm bảo data fresh
        // Đảm bảo table luôn hiển thị data mới sau bulk mutations
        await queryClient.invalidateQueries({ queryKey: queryKeys.adminStudents.all(), refetchType: "active" })
        await queryClient.refetchQueries({ queryKey: queryKeys.adminStudents.all(), type: "active" })
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : (error as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error ||
              (error as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.message ||
              STUDENT_MESSAGES.UNKNOWN_ERROR
        const errorTitles = {
          restore: STUDENT_MESSAGES.BULK_RESTORE_ERROR,
          delete: STUDENT_MESSAGES.BULK_DELETE_ERROR,
          "hard-delete": STUDENT_MESSAGES.BULK_HARD_DELETE_ERROR,
        }
        showFeedback("error", errorTitles[action], `Không thể thực hiện thao tác cho ${ids.length} học sinh`, errorMessage)
        if (action !== "restore") {
          throw error
        }
      } finally {
        stopBulkProcessing()
      }
    },
    [showFeedback, startBulkProcessing, stopBulkProcessing, isSocketConnected],
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
