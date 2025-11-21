/**
 * Custom hook để xử lý các actions của students
 * Tách logic xử lý actions ra khỏi component chính để code sạch hơn
 */

import { useCallback, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/axios"
import { apiRoutes } from "@/lib/api/routes"
import { queryKeys } from "@/lib/query-keys"
import { runResourceRefresh, useResourceBulkProcessing } from "@/features/admin/resources/hooks"
import type { ResourceRefreshHandler } from "@/features/admin/resources/types"
import type { StudentRow } from "../types"
import type { DataTableResult } from "@/components/tables"
import type { FeedbackVariant } from "@/components/dialogs"
import { STUDENT_MESSAGES } from "../constants/messages"
import { logger } from "@/lib/config"

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
        logger.warn("[useStudentActions] Toggle status denied - no permission", {
          action: "toggle-status",
          studentId: row.id,
          studentCode: row.studentCode,
        })
        showFeedback("error", STUDENT_MESSAGES.NO_PERMISSION, STUDENT_MESSAGES.NO_MANAGE_PERMISSION)
        return
      }

      logger.debug("[useStudentActions] Toggle status START", {
        action: "toggle-status",
        studentId: row.id,
        studentCode: row.studentCode,
        name: row.name,
        email: row.email,
        currentStatus: row.isActive,
        newStatus,
        socketConnected: isSocketConnected,
      })

      setTogglingStudents((prev) => new Set(prev).add(row.id))

      // Optimistic update chỉ khi không có socket (fallback)
      if (!isSocketConnected) {
        queryClient.setQueriesData<DataTableResult<StudentRow>>(
          { queryKey: queryKeys.adminStudents.all() as unknown[] },
          (oldData) => {
            if (!oldData) return oldData
            const updatedRows = oldData.rows.map((r) =>
              r.id === row.id ? { ...r, isActive: newStatus } : r
            )
            return { ...oldData, rows: updatedRows }
          },
        )
      }

      try {
        await apiClient.put(apiRoutes.students.update(row.id), {
          isActive: newStatus,
        })
        
        logger.debug("[useStudentActions] Toggle status SUCCESS", {
          action: "toggle-status",
          studentId: row.id,
          studentCode: row.studentCode,
          newStatus,
        })

        showFeedback(
          "success",
          STUDENT_MESSAGES.TOGGLE_ACTIVE_SUCCESS,
          `Đã ${newStatus ? "kích hoạt" : "vô hiệu hóa"} học sinh ${row.studentCode}`
        )
        // Socket events đã update cache, chỉ refresh nếu socket không connected
        if (!isSocketConnected) {
          await runResourceRefresh({ refresh, resource: "students" })
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : STUDENT_MESSAGES.UNKNOWN_ERROR
        logger.error("[useStudentActions] Toggle status ERROR", {
          action: "toggle-status",
          studentId: row.id,
          studentCode: row.studentCode,
          newStatus,
          error: error instanceof Error ? error.message : String(error),
        })
        showFeedback(
          "error",
          STUDENT_MESSAGES.TOGGLE_ACTIVE_ERROR,
          `Không thể ${newStatus ? "kích hoạt" : "vô hiệu hóa"} học sinh`,
          errorMessage
        )
        
        // Rollback optimistic update nếu có lỗi
        if (!isSocketConnected) {
          queryClient.invalidateQueries({ queryKey: queryKeys.adminStudents.all() })
        }
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
        logger.warn("[useStudentActions] Action denied - no permission", {
          action,
          studentId: row.id,
          studentCode: row.studentCode,
        })
        return
      }

      logger.debug("[useStudentActions] Single action START", {
        action,
        studentId: row.id,
        studentCode: row.studentCode,
        name: row.name,
        email: row.email,
        isActive: row.isActive,
        deletedAt: row.deletedAt,
        socketConnected: isSocketConnected,
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
        
        logger.debug("[useStudentActions] Single action SUCCESS", {
          action,
          studentId: row.id,
          studentCode: row.studentCode,
        })

        showFeedback("success", actionConfig.successTitle, actionConfig.successDescription)
        // Chỉ refresh nếu socket không connected (socket đã update cache rồi)
        if (!isSocketConnected) {
          await runResourceRefresh({ refresh, resource: "students" })
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : STUDENT_MESSAGES.UNKNOWN_ERROR
        logger.error("[useStudentActions] Single action ERROR", {
          action,
          studentId: row.id,
          studentCode: row.studentCode,
          error: error instanceof Error ? error.message : String(error),
        })
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

      logger.debug("[useStudentActions] Bulk action START", {
        action,
        count: ids.length,
        studentIds: ids,
        socketConnected: isSocketConnected,
      })

      try {
        await apiClient.post(apiRoutes.students.bulk, { action, ids })

        logger.debug("[useStudentActions] Bulk action SUCCESS", {
          action,
          count: ids.length,
          studentIds: ids,
        })

        const messages = {
          restore: { title: STUDENT_MESSAGES.BULK_RESTORE_SUCCESS, description: `Đã khôi phục ${ids.length} học sinh` },
          delete: { title: STUDENT_MESSAGES.BULK_DELETE_SUCCESS, description: `Đã xóa ${ids.length} học sinh` },
          "hard-delete": { title: STUDENT_MESSAGES.BULK_HARD_DELETE_SUCCESS, description: `Đã xóa vĩnh viễn ${ids.length} học sinh` },
        }

        showFeedback("success", messages[action].title, messages[action].description)
        clearSelection()

        // Socket events đã update cache, chỉ refresh nếu socket không connected
        if (!isSocketConnected) {
          await runResourceRefresh({ refresh, resource: "students" })
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : STUDENT_MESSAGES.UNKNOWN_ERROR
        logger.error("[useStudentActions] Bulk action ERROR", {
          action,
          count: ids.length,
          studentIds: ids,
          error: error instanceof Error ? error.message : String(error),
        })
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
