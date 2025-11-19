"use client"

import { useCallback, useEffect, useMemo, useRef } from "react"
import { RotateCcw, Trash2, AlertTriangle, Plus } from "lucide-react"

import { ConfirmDialog } from "@/components/dialogs"
import type { DataTableQueryState, DataTableResult } from "@/components/tables"
import { FeedbackDialog } from "@/components/dialogs"
import { Button } from "@/components/ui/button"
import { ResourceTableClient, SelectionActionsWrapper } from "@/features/admin/resources/components"
import type { ResourceViewMode } from "@/features/admin/resources/types"
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

import type { AdminStudentsListParams } from "@/lib/query-keys"
import type { StudentRow, StudentsResponse, StudentsTableClientProps } from "../types"
import { STUDENT_CONFIRM_MESSAGES, STUDENT_LABELS } from "../constants"
import { logger } from "@/lib/config"
import { useResourceRouter } from "@/hooks/use-resource-segment"

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

  const tableRefreshRef = useRef<(() => void) | null>(null)
  const tableSoftRefreshRef = useRef<(() => void) | null>(null)
  const pendingRealtimeRefreshRef = useRef(false)

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

  const handleToggleStatusWithRefresh = useCallback(
    (row: StudentRow, checked: boolean) => {
      if (tableRefreshRef.current) {
        handleToggleStatus(row, checked, tableRefreshRef.current)
      }
    },
    [handleToggleStatus],
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
          await executeSingleAction("delete", row, tableRefreshRef.current || (() => {}))
        },
      })
    },
    [canDelete, executeSingleAction, setDeleteConfirm],
  )

  const handleHardDeleteSingle = useCallback(
    (row: StudentRow) => {
      if (!canManage) return
      setDeleteConfirm({
        open: true,
        type: "hard",
        row,
        onConfirm: async () => {
          await executeSingleAction("hard-delete", row, tableRefreshRef.current || (() => {}))
        },
      })
    },
    [canManage, executeSingleAction, setDeleteConfirm],
  )

  const handleRestoreSingle = useCallback(
    (row: StudentRow) => {
      if (!canRestore) return
      setDeleteConfirm({
        open: true,
        type: "restore",
        row,
        onConfirm: async () => {
          await executeSingleAction("restore", row, tableRefreshRef.current || (() => {}))
        },
      })
    },
    [canRestore, executeSingleAction, setDeleteConfirm],
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

  // Handle realtime updates từ socket bridge
  useEffect(() => {
    if (cacheVersion === 0) return
    if (tableSoftRefreshRef.current) {
      tableSoftRefreshRef.current()
      pendingRealtimeRefreshRef.current = false
    } else {
      pendingRealtimeRefreshRef.current = true
    }
  }, [cacheVersion])

  // Set initialData vào React Query cache để socket bridge có thể cập nhật
  useEffect(() => {
    if (!initialData) return
    
    // Set initial data với params từ initialData
    const params: AdminStudentsListParams = {
      status: "active",
      page: initialData.page,
      limit: initialData.limit,
      search: undefined,
      filters: undefined,
    }
    const queryKey = queryKeys.adminStudents.list(params)
    queryClient.setQueryData(queryKey, initialData)
    
    logger.debug("Set initial data to cache", {
      queryKey: queryKey.slice(0, 2),
      rowsCount: initialData.rows.length,
      total: initialData.total,
    })
  }, [initialData, queryClient])

  const buildFiltersRecord = useCallback((filters: Record<string, string>): Record<string, string> => {
    return Object.entries(filters).reduce<Record<string, string>>((acc, [key, value]) => {
      if (value) {
        acc[key] = value
      }
      return acc
    }, {})
  }, [])

  const fetchStudents = useCallback(
    async ({
      page,
      limit,
      status,
      search,
      filters,
    }: {
      page: number
      limit: number
      status: "active" | "deleted" | "all"
      search?: string
      filters?: Record<string, string>
    }): Promise<DataTableResult<StudentRow>> => {
      const baseUrl = apiRoutes.students.list({
        page,
        limit,
        status,
        search,
      })

      const filterParams = new URLSearchParams()
      Object.entries(filters ?? {}).forEach(([key, value]) => {
        if (value) {
          filterParams.set(`filter[${key}]`, value)
        }
      })

      const filterString = filterParams.toString()
      const url = filterString ? `${baseUrl}&${filterString}` : baseUrl

      const response = await apiClient.get<StudentsResponse>(url)
      const payload = response.data

      if (!payload || !payload.data) {
        throw new Error("Không thể tải danh sách học sinh")
      }

      return {
        rows: payload.data || [],
        page: payload.pagination?.page ?? page,
        limit: payload.pagination?.limit ?? limit,
        total: payload.pagination?.total ?? 0,
        totalPages: payload.pagination?.totalPages ?? 0,
      }
    },
    [],
  )

  const loader = useCallback(
    async (query: DataTableQueryState, view: ResourceViewMode<StudentRow>) => {
      const status = (view.status ?? "active") as AdminStudentsListParams["status"]
      const search = query.search.trim() || undefined
      const filters = buildFiltersRecord(query.filters)

      const params: AdminStudentsListParams = {
        status,
        page: query.page,
        limit: query.limit,
        search,
        filters,
      }

      const queryKey = queryKeys.adminStudents.list(params)

      return await queryClient.fetchQuery({
        queryKey,
        staleTime: Infinity,
        queryFn: () =>
          fetchStudents({
            page: query.page,
            limit: query.limit,
            status: status ?? "active",
            search,
            filters,
          }),
      })
    },
    [buildFiltersRecord, fetchStudents, queryClient],
  )

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
        onRefreshReady={(refresh) => {
          const wrapped = () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.adminStudents.all(), refetchType: "none" })
            refresh()
          }
          tableSoftRefreshRef.current = refresh
          tableRefreshRef.current = wrapped

          if (pendingRealtimeRefreshRef.current) {
            pendingRealtimeRefreshRef.current = false
            refresh()
          }
        }}
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
