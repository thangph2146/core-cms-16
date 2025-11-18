"use client"

import { useCallback, useEffect, useMemo, useRef } from "react"
import { RotateCcw, Trash2, AlertTriangle, Plus } from "lucide-react"

import { ConfirmDialog } from "@/components/dialogs"
import type { DataTableQueryState, DataTableResult } from "@/components/tables"
import { FeedbackDialog } from "@/components/dialogs"
import { Button } from "@/components/ui/button"
import { ResourceTableClient } from "@/features/admin/resources/components/resource-table.client"
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
      executeSingleAction("restore", row, tableRefreshRef.current || (() => {}))
    },
    [canRestore, executeSingleAction],
  )

  const { renderActiveRowActions, renderDeletedRowActions } = useStudentRowActions({
    canDelete,
    canRestore,
    canManage,
    canUpdate,
    onDelete: handleDeleteSingle,
    onHardDelete: handleHardDeleteSingle,
    onRestore: handleRestoreSingle,
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

  const loader = useCallback(
    async (query: DataTableQueryState, view: ResourceViewMode<StudentRow>) => {
      const baseUrl = apiRoutes.students.list({
        page: query.page,
        limit: query.limit,
        status: view.status ?? "active",
        search: query.search.trim() || undefined,
      })

      const filterParams = new URLSearchParams()
      Object.entries(query.filters).forEach(([key, value]) => {
        if (value) {
          filterParams.set(`filter[${key}]`, value)
        }
      })

      const filterString = filterParams.toString()
      const url = filterString ? `${baseUrl}&${filterString}` : baseUrl

      const response = await apiClient.get<StudentsResponse>(url)
      const payload = response.data

      // Set vào cache với params tương ứng
      const viewStatus = (view.status ?? "active") as "active" | "deleted" | "all"
      const params: AdminStudentsListParams = {
        status: viewStatus,
        page: query.page,
        limit: query.limit,
        search: query.search.trim() || undefined,
        filters: Object.keys(query.filters).length > 0 ? query.filters : undefined,
      }
      const queryKey = queryKeys.adminStudents.list(params)
      const result: DataTableResult<StudentRow> = {
        rows: payload.data,
        page: payload.pagination.page,
        limit: payload.pagination.limit,
        total: payload.pagination.total,
        totalPages: payload.pagination.totalPages,
      }
      queryClient.setQueryData(queryKey, result)

      return result
    },
    [queryClient],
  )

  const viewModes = useMemo<ResourceViewMode<StudentRow>[]>(() => {
    const modes: ResourceViewMode<StudentRow>[] = [
      {
        id: "active",
        label: STUDENT_LABELS.ACTIVE_VIEW,
        status: "active",
        columns: baseColumns,
        selectionEnabled: canDelete,
        selectionActions: canDelete
          ? ({ selectedIds, clearSelection, refresh }) => (
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <span>
                  {STUDENT_LABELS.SELECTED_STUDENTS(selectedIds.length)}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={bulkState.isProcessing || selectedIds.length === 0}
                    onClick={() => {
                      setDeleteConfirm({
                        open: true,
                        type: "soft",
                        bulkIds: selectedIds,
                        onConfirm: async () => {
                          await executeBulkAction("delete", selectedIds, refresh, clearSelection)
                        },
                      })
                    }}
                  >
                    <Trash2 className="mr-2 h-5 w-5" />
                    {STUDENT_LABELS.DELETE} ({selectedIds.length})
                  </Button>
                  {canManage && (
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={bulkState.isProcessing || selectedIds.length === 0}
                      onClick={() => {
                        setDeleteConfirm({
                          open: true,
                          type: "hard",
                          bulkIds: selectedIds,
                          onConfirm: async () => {
                            await executeBulkAction("hard-delete", selectedIds, refresh, clearSelection)
                          },
                        })
                      }}
                    >
                      <AlertTriangle className="mr-2 h-5 w-5" />
                      {STUDENT_LABELS.HARD_DELETE} ({selectedIds.length})
                    </Button>
                  )}
                  <Button type="button" size="sm" variant="ghost" onClick={clearSelection}>
                    {STUDENT_LABELS.CLEAR_SELECTION}
                  </Button>
                </div>
              </div>
            )
          : undefined,
        rowActions: (row) => renderActiveRowActions(row),
        emptyMessage: STUDENT_LABELS.NO_STUDENTS,
      },
      {
        id: "deleted",
        label: STUDENT_LABELS.DELETED_VIEW,
        status: "deleted",
        columns: deletedColumns,
        selectionEnabled: canRestore || canManage,
        selectionActions: canRestore || canManage
          ? ({ selectedIds, clearSelection, refresh }) => (
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <span>
                  {STUDENT_LABELS.SELECTED_DELETED_STUDENTS(selectedIds.length)}
                </span>
                <div className="flex items-center gap-2">
                  {canRestore && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={bulkState.isProcessing || selectedIds.length === 0}
                      onClick={() => executeBulkAction("restore", selectedIds, refresh, clearSelection)}
                    >
                      <RotateCcw className="mr-2 h-5 w-5" />
                      {STUDENT_LABELS.RESTORE} ({selectedIds.length})
                    </Button>
                  )}
                  {canManage && (
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={bulkState.isProcessing || selectedIds.length === 0}
                      onClick={() => {
                        setDeleteConfirm({
                          open: true,
                          type: "hard",
                          bulkIds: selectedIds,
                          onConfirm: async () => {
                            await executeBulkAction("hard-delete", selectedIds, refresh, clearSelection)
                          },
                        })
                      }}
                    >
                      <AlertTriangle className="mr-2 h-5 w-5" />
                      {STUDENT_LABELS.HARD_DELETE} ({selectedIds.length})
                    </Button>
                  )}
                  <Button type="button" size="sm" variant="ghost" onClick={clearSelection}>
                    {STUDENT_LABELS.CLEAR_SELECTION}
                  </Button>
                </div>
              </div>
            )
          : undefined,
        rowActions: (row) => renderDeletedRowActions(row),
        emptyMessage: STUDENT_LABELS.NO_DELETED_STUDENTS,
      },
    ]

    return modes
  }, [
    baseColumns,
    deletedColumns,
    canDelete,
    canRestore,
    canManage,
    bulkState.isProcessing,
    executeBulkAction,
    renderActiveRowActions,
    renderDeletedRowActions,
    setDeleteConfirm,
  ])

  const initialDataByView = useMemo(
    () => (initialData ? { active: initialData } : undefined),
    [initialData],
  )

  const headerActions = canCreate ? (
    <Button
      type="button"
      size="sm"
      onClick={() => router.push("/admin/students/new")}
      className="h-8 px-3 text-xs sm:text-sm"
    >
      <Plus className="mr-2 h-5 w-5" />
      Thêm mới
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

      <ConfirmDialog
        open={deleteConfirm?.open ?? false}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteConfirm(null)
          }
        }}
        title={
          deleteConfirm
            ? deleteConfirm.type === "hard"
              ? STUDENT_CONFIRM_MESSAGES.HARD_DELETE_TITLE(
                  deleteConfirm.bulkIds?.length,
                  deleteConfirm.row?.studentCode
                )
              : STUDENT_CONFIRM_MESSAGES.DELETE_TITLE(
                  deleteConfirm.bulkIds?.length,
                  deleteConfirm.row?.studentCode
                )
            : ""
        }
        description={
          deleteConfirm
            ? deleteConfirm.type === "hard"
              ? STUDENT_CONFIRM_MESSAGES.HARD_DELETE_DESCRIPTION(
                  deleteConfirm.bulkIds?.length,
                  deleteConfirm.row?.studentCode
                )
              : STUDENT_CONFIRM_MESSAGES.DELETE_DESCRIPTION(
                  deleteConfirm.bulkIds?.length,
                  deleteConfirm.row?.studentCode
                )
            : ""
        }
        confirmLabel={deleteConfirm?.type === "hard" ? STUDENT_CONFIRM_MESSAGES.HARD_DELETE_LABEL : STUDENT_CONFIRM_MESSAGES.CONFIRM_LABEL}
        cancelLabel={STUDENT_CONFIRM_MESSAGES.CANCEL_LABEL}
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        isLoading={bulkState.isProcessing}
      />

      <FeedbackDialog
        open={feedback?.open ?? false}
        onOpenChange={handleFeedbackOpenChange}
        variant={feedback?.variant ?? "success"}
        title={feedback?.title ?? ""}
        description={feedback?.description}
        details={feedback?.details}
      />
    </>
  )
}
