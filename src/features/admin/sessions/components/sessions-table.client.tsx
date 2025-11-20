"use client"

import { useCallback, useMemo } from "react"
import { useResourceRouter } from "@/hooks/use-resource-segment"
import { Plus, RotateCcw, Trash2, AlertTriangle } from "lucide-react"

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
import { queryKeys, type AdminSessionsListParams } from "@/lib/query-keys"
import { useSessionsSocketBridge } from "../hooks/use-sessions-socket-bridge"
import { useSessionActions } from "../hooks/use-session-actions"
import { useSessionFeedback } from "../hooks/use-session-feedback"
import { useSessionDeleteConfirm } from "../hooks/use-session-delete-confirm"
import { useSessionColumns } from "../utils/columns"
import { useSessionRowActions } from "../utils/row-actions"

import type { SessionRow, SessionsResponse, SessionsTableClientProps } from "../types"
import { SESSION_CONFIRM_MESSAGES, SESSION_LABELS } from "../constants"
import { logger } from "@/lib/config"

export function SessionsTableClient({
  canDelete = false,
  canRestore = false,
  canManage = false,
  canCreate = false,
  initialData,
  initialUsersOptions: _initialUsersOptions = [],
}: SessionsTableClientProps) {
  const router = useResourceRouter()
  const queryClient = useQueryClient()
  const { isSocketConnected, cacheVersion } = useSessionsSocketBridge()
  const { feedback, showFeedback, handleFeedbackOpenChange } = useSessionFeedback()
  const { deleteConfirm, setDeleteConfirm, handleDeleteConfirm } = useSessionDeleteConfirm()

  const getInvalidateQueryKey = useCallback(() => queryKeys.adminSessions.all(), [])
  const { onRefreshReady, refresh: refreshTable } = useResourceTableRefresh({
    queryClient,
    getInvalidateQueryKey,
    cacheVersion,
  })

  const {
    handleToggleStatus,
    executeSingleAction,
    executeBulkAction,
    deletingSessions,
    restoringSessions,
    hardDeletingSessions,
    togglingSessions,
    bulkState,
  } = useSessionActions({
    canDelete,
    canRestore,
    canManage,
    isSocketConnected,
    showFeedback,
  })

  const handleToggleStatusWithRefresh = useCallback(
    (row: SessionRow, checked: boolean) => {
      if (!canManage) return
      setDeleteConfirm({
        open: true,
        type: checked ? "toggle-active" : "toggle-inactive",
        row,
        onConfirm: async () => {
          await handleToggleStatus(row, checked, refreshTable)
        },
      })
    },
    [canManage, handleToggleStatus, refreshTable, setDeleteConfirm],
  )

  const { baseColumns, deletedColumns } = useSessionColumns({
    togglingSessions,
    canManage,
    onToggleStatus: handleToggleStatusWithRefresh,
  })

  const handleDeleteSingle = useCallback(
    (row: SessionRow) => {
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
    (row: SessionRow) => {
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
    (row: SessionRow) => {
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

  const { renderActiveRowActions, renderDeletedRowActions } = useSessionRowActions({
    canDelete,
    canRestore,
    canManage,
    onToggleStatus: handleToggleStatusWithRefresh,
    onDelete: handleDeleteSingle,
    onHardDelete: handleHardDeleteSingle,
    onRestore: handleRestoreSingle,
    togglingSessions,
    deletingSessions,
    restoringSessions,
    hardDeletingSessions,
  })

  const fetchSessions = useCallback(
    async (params: AdminSessionsListParams): Promise<DataTableResult<SessionRow>> => {
      const baseUrl = apiRoutes.sessions.list({
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

      const response = await apiClient.get<SessionsResponse>(url)
      const payload = response.data

      return {
        rows: payload.data,
        page: payload.pagination.page,
        limit: payload.pagination.limit,
        total: payload.pagination.total,
        totalPages: payload.pagination.totalPages,
      }
    },
    [],
  )

  const buildParams = useCallback(
    ({ query, view }: { query: DataTableQueryState; view: ResourceViewMode<SessionRow> }): AdminSessionsListParams => {
      const filtersRecord = sanitizeFilters(query.filters)
      return {
        status: (view.status ?? "active") as AdminSessionsListParams["status"],
        page: query.page,
        limit: query.limit,
        search: normalizeSearch(query.search),
        filters: Object.keys(filtersRecord).length ? filtersRecord : undefined,
      }
    },
    [],
  )

  const buildQueryKey = useCallback((params: AdminSessionsListParams) => queryKeys.adminSessions.list(params), [])

  const loader = useResourceTableLoader({
    queryClient,
    fetcher: fetchSessions,
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
        label={SESSION_LABELS.SELECTED_SESSIONS(selectedIds.length)}
        actions={
          <>
            {canDelete && (
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
                  {SESSION_LABELS.DELETE_SELECTED(selectedIds.length)}
                </span>
                <span className="sm:hidden">Xóa</span>
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
                  {SESSION_LABELS.HARD_DELETE_SELECTED(selectedIds.length)}
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
              {SESSION_LABELS.CLEAR_SELECTION}
            </Button>
          </>
        }
      />
    ),
    [canDelete, canManage, bulkState.isProcessing, executeBulk],
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
        label={SESSION_LABELS.SELECTED_DELETED_SESSIONS(selectedIds.length)}
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
                  {SESSION_LABELS.RESTORE_SELECTED(selectedIds.length)}
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
                  {SESSION_LABELS.HARD_DELETE_SELECTED(selectedIds.length)}
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
              {SESSION_LABELS.CLEAR_SELECTION}
            </Button>
          </>
        }
      />
    ),
    [canRestore, canManage, bulkState.isProcessing, executeBulk],
  )

  const viewModes = useMemo<ResourceViewMode<SessionRow>[]>(() => {
    const modes: ResourceViewMode<SessionRow>[] = [
      {
        id: "active",
        label: SESSION_LABELS.ACTIVE_VIEW,
        status: "active",
        columns: baseColumns,
        selectionEnabled: canDelete || canManage,
        selectionActions: canDelete || canManage ? createActiveSelectionActions : undefined,
        rowActions: (row) => renderActiveRowActions(row),
        emptyMessage: SESSION_LABELS.NO_SESSIONS,
      },
      {
        id: "deleted",
        label: SESSION_LABELS.DELETED_VIEW,
        status: "deleted",
        columns: deletedColumns,
        selectionEnabled: canRestore || canManage,
        selectionActions: canRestore || canManage ? createDeletedSelectionActions : undefined,
        rowActions: (row) => renderDeletedRowActions(row),
        emptyMessage: SESSION_LABELS.NO_DELETED_SESSIONS,
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
      return SESSION_CONFIRM_MESSAGES.HARD_DELETE_TITLE(
        deleteConfirm.bulkIds?.length,
        deleteConfirm.row?.userName || deleteConfirm.row?.userEmail,
      )
    }
    if (deleteConfirm.type === "restore") {
      return SESSION_CONFIRM_MESSAGES.RESTORE_TITLE(
        deleteConfirm.bulkIds?.length,
        deleteConfirm.row?.userName || deleteConfirm.row?.userEmail,
      )
    }
    if (deleteConfirm.type === "toggle-active") {
      return SESSION_CONFIRM_MESSAGES.TOGGLE_ACTIVE_TITLE(
        deleteConfirm.bulkIds?.length,
        deleteConfirm.row?.userName || deleteConfirm.row?.userEmail,
      )
    }
    if (deleteConfirm.type === "toggle-inactive") {
      return SESSION_CONFIRM_MESSAGES.TOGGLE_INACTIVE_TITLE(
        deleteConfirm.bulkIds?.length,
        deleteConfirm.row?.userName || deleteConfirm.row?.userEmail,
      )
    }
    return SESSION_CONFIRM_MESSAGES.DELETE_TITLE(
      deleteConfirm.bulkIds?.length,
      deleteConfirm.row?.userName || deleteConfirm.row?.userEmail,
    )
  }

  const getDeleteConfirmDescription = () => {
    if (!deleteConfirm) return ""
    if (deleteConfirm.type === "hard") {
      return SESSION_CONFIRM_MESSAGES.HARD_DELETE_DESCRIPTION(
        deleteConfirm.bulkIds?.length,
        deleteConfirm.row?.userName || deleteConfirm.row?.userEmail,
      )
    }
    if (deleteConfirm.type === "restore") {
      return SESSION_CONFIRM_MESSAGES.RESTORE_DESCRIPTION(
        deleteConfirm.bulkIds?.length,
        deleteConfirm.row?.userName || deleteConfirm.row?.userEmail,
      )
    }
    if (deleteConfirm.type === "toggle-active") {
      return SESSION_CONFIRM_MESSAGES.TOGGLE_ACTIVE_DESCRIPTION(
        deleteConfirm.bulkIds?.length,
        deleteConfirm.row?.userName || deleteConfirm.row?.userEmail,
      )
    }
    if (deleteConfirm.type === "toggle-inactive") {
      return SESSION_CONFIRM_MESSAGES.TOGGLE_INACTIVE_DESCRIPTION(
        deleteConfirm.bulkIds?.length,
        deleteConfirm.row?.userName || deleteConfirm.row?.userEmail,
      )
    }
    return SESSION_CONFIRM_MESSAGES.DELETE_DESCRIPTION(
      deleteConfirm.bulkIds?.length,
      deleteConfirm.row?.userName || deleteConfirm.row?.userEmail,
    )
  }

  const headerActions = canCreate ? (
    <Button
      type="button"
      size="sm"
      onClick={() => router.push("/admin/sessions/new")}
      className="h-8 px-3 text-xs sm:text-sm"
    >
      <Plus className="mr-2 h-5 w-5" />
      {SESSION_LABELS.ADD_NEW}
    </Button>
  ) : undefined

  return (
    <>
      <ResourceTableClient<SessionRow>
        title={SESSION_LABELS.MANAGE_SESSIONS}
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
          variant={
            deleteConfirm.type === "hard" || deleteConfirm.type === "soft"
              ? "destructive"
              : deleteConfirm.type === "restore" || deleteConfirm.type === "toggle-active" || deleteConfirm.type === "toggle-inactive"
              ? "default"
              : "destructive"
          }
          confirmLabel={
            deleteConfirm.type === "hard"
              ? SESSION_CONFIRM_MESSAGES.HARD_DELETE_LABEL
              : deleteConfirm.type === "restore"
              ? SESSION_CONFIRM_MESSAGES.RESTORE_LABEL
              : deleteConfirm.type === "toggle-active"
              ? SESSION_CONFIRM_MESSAGES.TOGGLE_ACTIVE_LABEL
              : deleteConfirm.type === "toggle-inactive"
              ? SESSION_CONFIRM_MESSAGES.TOGGLE_INACTIVE_LABEL
              : SESSION_CONFIRM_MESSAGES.CONFIRM_LABEL
          }
          cancelLabel={SESSION_CONFIRM_MESSAGES.CANCEL_LABEL}
          onConfirm={handleDeleteConfirm}
          isLoading={
            bulkState.isProcessing ||
            (deleteConfirm.row
              ? deleteConfirm.type === "restore"
                ? restoringSessions.has(deleteConfirm.row.id)
                : deleteConfirm.type === "hard"
                ? hardDeletingSessions.has(deleteConfirm.row.id)
                : deleteConfirm.type === "toggle-active" || deleteConfirm.type === "toggle-inactive"
                ? togglingSessions.has(deleteConfirm.row.id)
                : deletingSessions.has(deleteConfirm.row.id)
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
