"use client"

import { useCallback, useMemo } from "react"
import { RotateCcw, Trash2, AlertTriangle, Plus } from "lucide-react"

import { ConfirmDialog } from "@/components/dialogs"
import type { DataTableQueryState, DataTableResult } from "@/components/tables"
import { FeedbackDialog } from "@/components/dialogs"
import { Button } from "@/components/ui/button"
import { ResourceTableClient, SelectionActionsWrapper } from "@/features/admin/resources/components"
import type { ResourceViewMode } from "@/features/admin/resources/types"
import {
  useResourceTableRefresh,
  useResourceInitialDataCache,
  useResourceTableLoader,
} from "@/features/admin/resources/hooks"
import { sanitizeFilters, normalizeSearch } from "@/features/admin/resources/utils"
import { apiClient } from "@/lib/api/axios"
import { apiRoutes } from "@/lib/api/routes"
import { useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"
import { useStudentsSocketBridge } from "../hooks/use-students-socket-bridge"
import { useStudentActions } from "../hooks/use-student-actions"
import { useStudentFeedback } from "../hooks/use-student-feedback"
import { useStudentDeleteConfirm } from "../hooks/use-student-delete-confirm"
import { useStudentColumns } from "../utils/columns"
import { useStudentRowActions } from "../utils/row-actions"
import { useResourceRouter } from "@/hooks/use-resource-segment"

import type { AdminStudentsListParams } from "@/lib/query-keys"
import type { StudentRow, StudentsResponse, StudentsTableClientProps } from "../types"
import { STUDENT_CONFIRM_MESSAGES, STUDENT_LABELS } from "../constants"
import { logger } from "@/lib/config"

export function StudentsTableClient({
  canDelete = false,
  canRestore = false,
  canManage = false,
  canCreate = false,
  canUpdate = false,
  initialData,
  initialUsersOptions: _initialUsersOptions = [],
}: StudentsTableClientProps) {
  const router = useResourceRouter()
  const queryClient = useQueryClient()
  const { isSocketConnected, cacheVersion } = useStudentsSocketBridge()
  const { feedback, showFeedback, handleFeedbackOpenChange } = useStudentFeedback()
  const { deleteConfirm, setDeleteConfirm, handleDeleteConfirm } = useStudentDeleteConfirm()

  const {
    handleToggleStatus,
    executeSingleAction,
    executeBulkAction,
    togglingStudents,
    deletingStudents,
    restoringStudents,
    hardDeletingStudents,
    bulkState,
  } = useStudentActions({
    canDelete,
    canRestore,
    canManage,
    isSocketConnected,
    showFeedback,
  })

  const getInvalidateQueryKey = useCallback(() => queryKeys.adminStudents.all(), [])
  // Chỉ trigger refresh từ socket khi không có bulk operation đang chạy
  // Khi có bulk operation, runResourceRefresh sẽ handle refresh
  const { onRefreshReady, refresh: refreshTable } = useResourceTableRefresh({
    queryClient,
    getInvalidateQueryKey,
    cacheVersion: bulkState.isProcessing ? undefined : cacheVersion, // Skip socket refresh khi đang bulk
  })

  const handleToggleStatusWithRefresh = useCallback(
    (row: StudentRow, checked: boolean) => {
      handleToggleStatus(row, checked, refreshTable)
    },
    [handleToggleStatus, refreshTable],
  )

  const { baseColumns, deletedColumns } = useStudentColumns({
    togglingStudents,
    canManage,
    onToggleStatus: handleToggleStatusWithRefresh,
  })

  const handleDeleteSingle = useCallback(
    (row: StudentRow) => {
      if (!canDelete) return
      setDeleteConfirm({
        open: true,
        type: "soft",
        row,
        onConfirm: async () => {
          await executeSingleAction("delete", row, refreshTable)
        },
      })
    },
    [canDelete, executeSingleAction, refreshTable, setDeleteConfirm],
  )

  const handleHardDeleteSingle = useCallback(
    (row: StudentRow) => {
      if (!canManage) return
      setDeleteConfirm({
        open: true,
        type: "hard",
        row,
        onConfirm: async () => {
          await executeSingleAction("hard-delete", row, refreshTable)
        },
      })
    },
    [canManage, executeSingleAction, refreshTable, setDeleteConfirm],
  )

  const handleRestoreSingle = useCallback(
    (row: StudentRow) => {
      if (!canRestore) return
      setDeleteConfirm({
        open: true,
        type: "restore",
        row,
        onConfirm: async () => {
          await executeSingleAction("restore", row, refreshTable)
        },
      })
    },
    [canRestore, executeSingleAction, refreshTable, setDeleteConfirm],
  )

  const { renderActiveRowActions, renderDeletedRowActions } = useStudentRowActions({
    canDelete,
    canRestore,
    canManage,
    canUpdate,
    onDelete: handleDeleteSingle,
    onHardDelete: handleHardDeleteSingle,
    onRestore: handleRestoreSingle,
    deletingStudents,
    restoringStudents,
    hardDeletingStudents,
  })

  const fetchStudents = useCallback(
    async (params: AdminStudentsListParams): Promise<DataTableResult<StudentRow>> => {
      const baseUrl = apiRoutes.students.list({
        page: params.page,
        limit: params.limit,
        status: params.status ?? "active",
        search: params.search,
      })

      const filterParams = new URLSearchParams()
      Object.entries(params.filters ?? {}).forEach(([key, value]) => {
        if (value) {
          filterParams.set(`filter[${key}]`, value)
        }
      })

      const filterString = filterParams.toString()
      const url = filterString ? `${baseUrl}&${filterString}` : baseUrl

      logger.debug("[StudentsTableClient] fetchStudents START", { url, params })

      const response = await apiClient.get<{
        success: boolean
        data?: StudentsResponse
        error?: string
        message?: string
      }>(url)

      logger.debug("[StudentsTableClient] fetchStudents API response", { 
        success: response.data.success,
        hasData: !!response.data.data,
        dataRowsCount: response.data.data?.data?.length ?? 0,
        pagination: response.data.data?.pagination,
        // Log sample rows để verify data
        sampleRows: response.data.data?.data?.slice(0, 3).map((r: StudentRow) => ({
          id: r.id,
          name: r.name,
          email: r.email,
          studentCode: r.studentCode,
          isActive: r.isActive,
          deletedAt: r.deletedAt,
        })),
        fullResponse: response.data,
      })

      const payload = response.data.data
      if (!payload) {
        logger.error("[StudentsTableClient] fetchStudents - No payload", { response: response.data })
        throw new Error(response.data.error || response.data.message || "Không thể tải danh sách học sinh")
      }

      // Đảm bảo rows luôn là array
      const rows = Array.isArray(payload.data) ? payload.data : []

      const result = {
        rows,
        page: payload.pagination?.page ?? params.page,
        limit: payload.pagination?.limit ?? params.limit,
        total: payload.pagination?.total ?? rows.length,
        totalPages: payload.pagination?.totalPages ?? 0,
      }

      logger.debug("[StudentsTableClient] fetchStudents END", { 
        rowsCount: result.rows.length,
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
        // Log sample rows để verify UI sẽ hiển thị
        sampleRows: result.rows.slice(0, 3).map(r => ({
          id: r.id,
          name: r.name,
          email: r.email,
          studentCode: r.studentCode,
          isActive: r.isActive,
          deletedAt: r.deletedAt,
        })),
      })

      return result
    },
    [],
  )

  const buildParams = useCallback(
    ({ query, view }: { query: DataTableQueryState; view: ResourceViewMode<StudentRow> }): AdminStudentsListParams => {
      const filtersRecord = sanitizeFilters(query.filters)
      return {
        status: (view.status ?? "active") as AdminStudentsListParams["status"],
        page: query.page,
        limit: query.limit,
        search: normalizeSearch(query.search),
        filters: Object.keys(filtersRecord).length ? filtersRecord : undefined,
      }
    },
    [],
  )

  const buildQueryKey = useCallback((params: AdminStudentsListParams) => queryKeys.adminStudents.list(params), [])

  const loader = useResourceTableLoader({
    queryClient,
    fetcher: fetchStudents,
    buildParams,
    buildQueryKey,
  })

  useResourceInitialDataCache({
    initialData,
    queryClient,
    buildParams: (data) => ({
      status: "active" as const,
      page: data.page,
      limit: data.limit,
      search: undefined,
      filters: undefined,
    }),
    buildQueryKey,
    logDebug: logger.debug,
  })

  const executeBulk = useCallback(
    (action: "delete" | "restore" | "hard-delete", ids: string[], refresh: () => void, clearSelection: () => void) => {
      if (ids.length === 0) return

      // Actions cần confirmation
      if (action === "delete" || action === "restore" || action === "hard-delete") {
        setDeleteConfirm({
          open: true,
          type: action === "hard-delete" ? "hard" : action === "restore" ? "restore" : "soft",
          bulkIds: ids,
          onConfirm: async () => {
            await executeBulkAction(action, ids, refresh, clearSelection)
          },
        })
      } else {
        executeBulkAction(action, ids, refresh, clearSelection)
      }
    },
    [executeBulkAction, setDeleteConfirm],
  )

  const createActiveSelectionActions = useCallback(
    ({
      selectedIds,
      clearSelection,
      refresh,
    }: {
      selectedIds: string[]
      clearSelection: () => void
      refresh: () => void
    }) => (
      <SelectionActionsWrapper
        label={STUDENT_LABELS.SELECTED_STUDENTS(selectedIds.length)}
        actions={
          <>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={bulkState.isProcessing || selectedIds.length === 0}
              onClick={() => executeBulk("delete", selectedIds, refresh, clearSelection)}
              className="whitespace-nowrap"
            >
              <Trash2 className="mr-2 h-5 w-5 shrink-0" />
              <span className="hidden sm:inline">
                {STUDENT_LABELS.DELETE_SELECTED(selectedIds.length)}
              </span>
              <span className="sm:hidden">Xóa</span>
            </Button>
            {canManage && (
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={bulkState.isProcessing || selectedIds.length === 0}
                onClick={() => executeBulk("hard-delete", selectedIds, refresh, clearSelection)}
                className="whitespace-nowrap"
              >
                <AlertTriangle className="mr-2 h-5 w-5 shrink-0" />
                <span className="hidden sm:inline">
                  {STUDENT_LABELS.HARD_DELETE_SELECTED(selectedIds.length)}
                </span>
                <span className="sm:hidden">Xóa vĩnh viễn</span>
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={clearSelection}
              className="whitespace-nowrap"
            >
              {STUDENT_LABELS.CLEAR_SELECTION}
            </Button>
          </>
        }
      />
    ),
    [canManage, bulkState.isProcessing, executeBulk],
  )

  const createDeletedSelectionActions = useCallback(
    ({
      selectedIds,
      clearSelection,
      refresh,
    }: {
      selectedIds: string[]
      clearSelection: () => void
      refresh: () => void
    }) => (
      <SelectionActionsWrapper
        label={STUDENT_LABELS.SELECTED_DELETED_STUDENTS(selectedIds.length)}
        actions={
          <>
            {canRestore && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={bulkState.isProcessing || selectedIds.length === 0}
                onClick={() => executeBulk("restore", selectedIds, refresh, clearSelection)}
                className="whitespace-nowrap"
              >
                <RotateCcw className="mr-2 h-5 w-5 shrink-0" />
                <span className="hidden sm:inline">
                  {STUDENT_LABELS.RESTORE_SELECTED(selectedIds.length)}
                </span>
                <span className="sm:hidden">Khôi phục</span>
              </Button>
            )}
            {canManage && (
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={bulkState.isProcessing || selectedIds.length === 0}
                onClick={() => executeBulk("hard-delete", selectedIds, refresh, clearSelection)}
                className="whitespace-nowrap"
              >
                <AlertTriangle className="mr-2 h-5 w-5 shrink-0" />
                <span className="hidden sm:inline">
                  {STUDENT_LABELS.HARD_DELETE_SELECTED(selectedIds.length)}
                </span>
                <span className="sm:hidden">Xóa vĩnh viễn</span>
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={clearSelection}
              className="whitespace-nowrap"
            >
              {STUDENT_LABELS.CLEAR_SELECTION}
            </Button>
          </>
        }
      />
    ),
    [canRestore, canManage, bulkState.isProcessing, executeBulk],
  )

  const viewModes = useMemo<ResourceViewMode<StudentRow>[]>(() => {
    const modes: ResourceViewMode<StudentRow>[] = [
      {
        id: "active",
        label: STUDENT_LABELS.ACTIVE_VIEW,
        status: "active",
        columns: baseColumns,
        selectionEnabled: canDelete,
        selectionActions: canDelete ? createActiveSelectionActions : undefined,
        rowActions: (row) => renderActiveRowActions(row),
        emptyMessage: STUDENT_LABELS.NO_STUDENTS,
      },
      {
        id: "deleted",
        label: STUDENT_LABELS.DELETED_VIEW,
        status: "deleted",
        columns: deletedColumns,
        selectionEnabled: canRestore || canManage,
        selectionActions: canRestore || canManage ? createDeletedSelectionActions : undefined,
        rowActions: (row) => renderDeletedRowActions(row),
        emptyMessage: STUDENT_LABELS.NO_DELETED_STUDENTS,
      },
    ]

    return modes
  }, [
    canDelete,
    canRestore,
    canManage,
    baseColumns,
    deletedColumns,
    createActiveSelectionActions,
    createDeletedSelectionActions,
    renderActiveRowActions,
    renderDeletedRowActions,
  ])

  const initialDataByView = useMemo(
    () => (initialData ? { active: initialData } : undefined),
    [initialData],
  )

  const getDeleteConfirmTitle = () => {
    if (!deleteConfirm) return ""
    if (deleteConfirm.type === "hard") {
      return STUDENT_CONFIRM_MESSAGES.HARD_DELETE_TITLE(
        deleteConfirm.bulkIds?.length,
        deleteConfirm.row?.studentCode,
      )
    }
    if (deleteConfirm.type === "restore") {
      return STUDENT_CONFIRM_MESSAGES.RESTORE_TITLE(
        deleteConfirm.bulkIds?.length,
        deleteConfirm.row?.studentCode,
      )
    }
    return STUDENT_CONFIRM_MESSAGES.DELETE_TITLE(
      deleteConfirm.bulkIds?.length,
      deleteConfirm.row?.studentCode,
    )
  }

  const getDeleteConfirmDescription = () => {
    if (!deleteConfirm) return ""
    if (deleteConfirm.type === "hard") {
      return STUDENT_CONFIRM_MESSAGES.HARD_DELETE_DESCRIPTION(
        deleteConfirm.bulkIds?.length,
        deleteConfirm.row?.studentCode,
      )
    }
    if (deleteConfirm.type === "restore") {
      return STUDENT_CONFIRM_MESSAGES.RESTORE_DESCRIPTION(
        deleteConfirm.bulkIds?.length,
        deleteConfirm.row?.studentCode,
      )
    }
    return STUDENT_CONFIRM_MESSAGES.DELETE_DESCRIPTION(
      deleteConfirm.bulkIds?.length,
      deleteConfirm.row?.studentCode,
    )
  }

  const headerActions = canCreate ? (
    <Button
      type="button"
      size="sm"
      onClick={() => router.push("/admin/students/new")}
      className="h-8 px-3 text-xs sm:text-sm"
    >
      <Plus className="mr-2 h-5 w-5" />
      {STUDENT_LABELS.ADD_NEW}
    </Button>
  ) : undefined

  return (
    <>
      <ResourceTableClient<StudentRow>
        title={STUDENT_LABELS.MANAGE_STUDENTS}
        baseColumns={baseColumns}
        loader={loader}
        viewModes={viewModes}
        defaultViewId="active"
        initialDataByView={initialDataByView}
        fallbackRowCount={6}
        headerActions={headerActions}
        onRefreshReady={onRefreshReady}
      />

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <ConfirmDialog
          open={deleteConfirm.open}
          onOpenChange={(open) => {
            if (!open) setDeleteConfirm(null)
          }}
          title={getDeleteConfirmTitle()}
          description={getDeleteConfirmDescription()}
          variant={deleteConfirm.type === "hard" ? "destructive" : deleteConfirm.type === "restore" ? "default" : "destructive"}
          confirmLabel={
            deleteConfirm.type === "hard"
              ? STUDENT_CONFIRM_MESSAGES.HARD_DELETE_LABEL
              : deleteConfirm.type === "restore"
              ? STUDENT_CONFIRM_MESSAGES.RESTORE_LABEL
              : STUDENT_CONFIRM_MESSAGES.CONFIRM_LABEL
          }
          cancelLabel={STUDENT_CONFIRM_MESSAGES.CANCEL_LABEL}
          onConfirm={handleDeleteConfirm}
          isLoading={
            bulkState.isProcessing ||
            (deleteConfirm.row
              ? deleteConfirm.type === "restore"
                ? restoringStudents.has(deleteConfirm.row.id)
                : deleteConfirm.type === "hard"
                ? hardDeletingStudents.has(deleteConfirm.row.id)
                : deletingStudents.has(deleteConfirm.row.id)
              : false)
          }
        />
      )}

      {/* Feedback Dialog */}
      {feedback && (
        <FeedbackDialog
          open={feedback.open}
          onOpenChange={handleFeedbackOpenChange}
          variant={feedback.variant}
          title={feedback.title}
          description={feedback.description}
          details={feedback.details}
        />
      )}
    </>
  )
}
