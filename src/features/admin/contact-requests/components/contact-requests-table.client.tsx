"use client"

import { useCallback, useMemo } from "react"
import { RotateCcw, Trash2, AlertTriangle } from "lucide-react"

import { ConfirmDialog } from "@/components/dialogs"
import type { DataTableQueryState, DataTableResult } from "@/components/tables"
import { FeedbackDialog } from "@/components/dialogs"
import { Button } from "@/components/ui/button"
import {
  ResourceTableClient,
  SelectionActionsWrapper,
} from "@/features/admin/resources/components"
import type { ResourceViewMode } from "@/features/admin/resources/types"
import {
  useResourceInitialDataCache,
  useResourceTableLoader,
  useResourceTableRefresh,
} from "@/features/admin/resources/hooks"
import { normalizeSearch, sanitizeFilters } from "@/features/admin/resources/utils"
import { apiClient } from "@/lib/api/axios"
import { apiRoutes } from "@/lib/api/routes"
import { useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"
import { useContactRequestsSocketBridge } from "../hooks/use-contact-requests-socket-bridge"
import { useContactRequestActions } from "../hooks/use-contact-request-actions"
import { useContactRequestFeedback } from "../hooks/use-contact-request-feedback"
import { useContactRequestDeleteConfirm } from "../hooks/use-contact-request-delete-confirm"
import { useContactRequestColumns } from "../utils/columns"
import { useContactRequestRowActions } from "../utils/row-actions"

import type { AdminContactRequestsListParams } from "@/lib/query-keys"
import type { ContactRequestRow, ContactRequestsResponse, ContactRequestsTableClientProps } from "../types"
import { CONTACT_REQUEST_CONFIRM_MESSAGES, CONTACT_REQUEST_LABELS } from "../constants"
import { logger } from "@/lib/config"

export function ContactRequestsTableClient({
  canDelete = false,
  canRestore = false,
  canManage = false,
  canUpdate = false,
  canAssign: _canAssign = false,
  initialData,
  initialUsersOptions = [],
}: ContactRequestsTableClientProps) {
  const queryClient = useQueryClient()
  const { isSocketConnected, cacheVersion } = useContactRequestsSocketBridge()
  const { feedback, showFeedback, handleFeedbackOpenChange } = useContactRequestFeedback()
  const { deleteConfirm, setDeleteConfirm, handleDeleteConfirm } = useContactRequestDeleteConfirm()

  const getInvalidateQueryKey = useCallback(() => queryKeys.adminContactRequests.all(), [])
  const { onRefreshReady, refresh: refreshTable } = useResourceTableRefresh({
    queryClient,
    getInvalidateQueryKey,
    cacheVersion,
  })

  const {
    handleToggleRead,
    executeSingleAction,
    executeBulkAction,
    markingReadRequests,
    markingUnreadRequests,
    togglingRequests,
    deletingRequests,
    restoringRequests,
    hardDeletingRequests,
    bulkState,
  } = useContactRequestActions({
    canDelete,
    canRestore,
    canManage,
    canUpdate,
    isSocketConnected,
    showFeedback,
  })

  const handleToggleReadWithRefresh = useCallback(
    (row: ContactRequestRow, checked: boolean) => {
      if (!canUpdate) return
      setDeleteConfirm({
        open: true,
        type: checked ? "mark-read" : "mark-unread",
        row,
        onConfirm: async () => {
          await handleToggleRead(row, checked, refreshTable)
        },
      })
    },
    [canUpdate, handleToggleRead, refreshTable, setDeleteConfirm],
  )

  const { baseColumns, deletedColumns } = useContactRequestColumns({
    togglingRequests,
    canUpdate,
    initialUsersOptions,
    onToggleRead: handleToggleReadWithRefresh,
  })

  const handleDeleteSingle = useCallback(
    (row: ContactRequestRow) => {
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
    (row: ContactRequestRow) => {
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
    (row: ContactRequestRow) => {
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

  const { renderActiveRowActions, renderDeletedRowActions } = useContactRequestRowActions({
    canDelete,
    canRestore,
    canManage,
    canUpdate,
    onToggleRead: handleToggleReadWithRefresh,
    onDelete: handleDeleteSingle,
    onHardDelete: handleHardDeleteSingle,
    onRestore: handleRestoreSingle,
    markingReadRequests,
    markingUnreadRequests,
    deletingRequests,
    restoringRequests,
    hardDeletingRequests,
  })


  const fetchContactRequests = useCallback(
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
    }): Promise<DataTableResult<ContactRequestRow>> => {
      const baseUrl = apiRoutes.contactRequests.list({
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

      const response = await apiClient.get<ContactRequestsResponse>(url)
      const payload = response.data

      if (!payload || !payload.data) {
        throw new Error("Không thể tải danh sách liên hệ")
      }

      return {
        rows: payload.data,
        page: payload.pagination?.page ?? page,
        limit: payload.pagination?.limit ?? limit,
        total: payload.pagination?.total ?? 0,
        totalPages: payload.pagination?.totalPages ?? 0,
      }
    },
    [],
  )

  const buildListParams = useCallback(
    ({ query, view }: { query: DataTableQueryState; view: ResourceViewMode<ContactRequestRow> }): AdminContactRequestsListParams => {
      const filtersRecord = sanitizeFilters(query.filters)

      return {
        status: (view.status ?? "active") as AdminContactRequestsListParams["status"],
        page: query.page,
        limit: query.limit,
        search: normalizeSearch(query.search),
        filters: Object.keys(filtersRecord).length ? filtersRecord : undefined,
      }
    },
    [],
  )

  const fetchContactRequestsWithDefaults = useCallback(
    (params: AdminContactRequestsListParams) =>
      fetchContactRequests({
        page: params.page,
        limit: params.limit,
        status: (params.status ?? "active") as "active" | "deleted" | "all",
        search: params.search,
        filters: params.filters,
      }),
    [fetchContactRequests],
  )

  const loader = useResourceTableLoader<ContactRequestRow, AdminContactRequestsListParams>({
    queryClient,
    fetcher: fetchContactRequestsWithDefaults,
    buildParams: buildListParams,
    buildQueryKey: queryKeys.adminContactRequests.list,
  })


  // Helper function for active view selection actions
  const createActiveSelectionActions = useCallback(
    ({ selectedIds, clearSelection, refresh }: {
      selectedIds: string[]
      clearSelection: () => void
      refresh: () => void
    }) => (
      <SelectionActionsWrapper
        label={CONTACT_REQUEST_LABELS.SELECTED_CONTACT_REQUESTS(selectedIds.length)}
        actions={
          <>
            {canDelete && (
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
                className="whitespace-nowrap"
              >
                <Trash2 className="mr-2 h-5 w-5 shrink-0" />
                <span className="hidden sm:inline">
                  {CONTACT_REQUEST_LABELS.DELETE_SELECTED(selectedIds.length)}
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
                className="whitespace-nowrap"
              >
                <AlertTriangle className="mr-2 h-5 w-5 shrink-0" />
                <span className="hidden sm:inline">
                  {CONTACT_REQUEST_LABELS.HARD_DELETE_SELECTED(selectedIds.length)}
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
              {CONTACT_REQUEST_LABELS.CLEAR_SELECTION}
            </Button>
          </>
        }
      />
    ),
    [canDelete, canManage, bulkState.isProcessing, setDeleteConfirm, executeBulkAction],
  )

  // Helper function for deleted view selection actions
  const createDeletedSelectionActions = useCallback(
    ({ selectedIds, clearSelection, refresh }: {
      selectedIds: string[]
      clearSelection: () => void
      refresh: () => void
    }) => (
      <SelectionActionsWrapper
        label={CONTACT_REQUEST_LABELS.SELECTED_DELETED_CONTACT_REQUESTS(selectedIds.length)}
        actions={
          <>
            {canRestore && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={bulkState.isProcessing || selectedIds.length === 0}
                onClick={() => {
                  setDeleteConfirm({
                    open: true,
                    type: "restore",
                    bulkIds: selectedIds,
                    onConfirm: async () => {
                      await executeBulkAction("restore", selectedIds, refresh, clearSelection)
                    },
                  })
                }}
                className="whitespace-nowrap"
              >
                <RotateCcw className="mr-2 h-5 w-5 shrink-0" />
                <span className="hidden sm:inline">
                  {CONTACT_REQUEST_LABELS.RESTORE_SELECTED(selectedIds.length)}
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
                className="whitespace-nowrap"
              >
                <AlertTriangle className="mr-2 h-5 w-5 shrink-0" />
                <span className="hidden sm:inline">
                  {CONTACT_REQUEST_LABELS.HARD_DELETE_SELECTED(selectedIds.length)}
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
              {CONTACT_REQUEST_LABELS.CLEAR_SELECTION}
            </Button>
          </>
        }
      />
    ),
    [canRestore, canManage, bulkState.isProcessing, setDeleteConfirm, executeBulkAction],
  )

  const viewModes = useMemo<ResourceViewMode<ContactRequestRow>[]>(() => {
    const modes: ResourceViewMode<ContactRequestRow>[] = [
      {
        id: "new",
        label: CONTACT_REQUEST_LABELS.NEW,
        status: "NEW",
        columns: baseColumns,
        selectionEnabled: canDelete || canUpdate,
        selectionActions: canDelete || canUpdate ? createActiveSelectionActions : undefined,
        rowActions: (row) => renderActiveRowActions(row),
        emptyMessage: CONTACT_REQUEST_LABELS.NO_CONTACT_REQUESTS,
      },
      {
        id: "active",
        label: CONTACT_REQUEST_LABELS.ACTIVE_VIEW,
        status: "active",
        columns: baseColumns,
        selectionEnabled: canDelete || canUpdate,
        selectionActions: canDelete || canUpdate ? createActiveSelectionActions : undefined,
        rowActions: (row) => renderActiveRowActions(row),
        emptyMessage: CONTACT_REQUEST_LABELS.NO_CONTACT_REQUESTS,
      },
      {
        id: "deleted",
        label: CONTACT_REQUEST_LABELS.DELETED_VIEW,
        status: "deleted",
        columns: deletedColumns,
        selectionEnabled: canRestore || canManage,
        selectionActions: canRestore || canManage ? createDeletedSelectionActions : undefined,
        rowActions: (row) => renderDeletedRowActions(row),
        emptyMessage: CONTACT_REQUEST_LABELS.NO_DELETED_CONTACT_REQUESTS,
      },
    ]

    return modes
  }, [
    baseColumns,
    deletedColumns,
    canDelete,
    canRestore,
    canManage,
    canUpdate,
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
      return CONTACT_REQUEST_CONFIRM_MESSAGES.HARD_DELETE_TITLE(
        deleteConfirm.bulkIds?.length,
        deleteConfirm.row?.subject,
      )
    }
    if (deleteConfirm.type === "restore") {
      return CONTACT_REQUEST_CONFIRM_MESSAGES.RESTORE_TITLE(
        deleteConfirm.bulkIds?.length,
        deleteConfirm.row?.subject,
      )
    }
    if (deleteConfirm.type === "mark-read") {
      return CONTACT_REQUEST_CONFIRM_MESSAGES.MARK_READ_TITLE(
        deleteConfirm.bulkIds?.length,
        deleteConfirm.row?.subject,
      )
    }
    if (deleteConfirm.type === "mark-unread") {
      return CONTACT_REQUEST_CONFIRM_MESSAGES.MARK_UNREAD_TITLE(
        deleteConfirm.bulkIds?.length,
        deleteConfirm.row?.subject,
      )
    }
    return CONTACT_REQUEST_CONFIRM_MESSAGES.DELETE_TITLE(
      deleteConfirm.bulkIds?.length,
      deleteConfirm.row?.subject,
    )
  }

  const getDeleteConfirmDescription = () => {
    if (!deleteConfirm) return ""
    if (deleteConfirm.type === "hard") {
      return CONTACT_REQUEST_CONFIRM_MESSAGES.HARD_DELETE_DESCRIPTION(
        deleteConfirm.bulkIds?.length,
        deleteConfirm.row?.subject,
      )
    }
    if (deleteConfirm.type === "restore") {
      return CONTACT_REQUEST_CONFIRM_MESSAGES.RESTORE_DESCRIPTION(
        deleteConfirm.bulkIds?.length,
        deleteConfirm.row?.subject,
      )
    }
    if (deleteConfirm.type === "mark-read") {
      return CONTACT_REQUEST_CONFIRM_MESSAGES.MARK_READ_DESCRIPTION(
        deleteConfirm.bulkIds?.length,
        deleteConfirm.row?.subject,
      )
    }
    if (deleteConfirm.type === "mark-unread") {
      return CONTACT_REQUEST_CONFIRM_MESSAGES.MARK_UNREAD_DESCRIPTION(
        deleteConfirm.bulkIds?.length,
        deleteConfirm.row?.subject,
      )
    }
    return CONTACT_REQUEST_CONFIRM_MESSAGES.DELETE_DESCRIPTION(
      deleteConfirm.bulkIds?.length,
      deleteConfirm.row?.subject,
    )
  }

  const buildInitialParams = useCallback(
    (data: DataTableResult<ContactRequestRow>): AdminContactRequestsListParams => ({
      status: "active",
      page: data.page,
      limit: data.limit,
      search: undefined,
      filters: undefined,
    }),
    [],
  )

  const logInitialDataCache = useCallback(
    (message: string, meta?: Record<string, unknown>) => {
      const queryKeyMeta = (meta as { queryKey?: unknown } | undefined)?.queryKey
      const formattedMeta = meta
        ? {
            ...meta,
            queryKey: Array.isArray(queryKeyMeta) ? queryKeyMeta.slice(0, 2) : queryKeyMeta,
          }
        : undefined

      logger.debug(message, formattedMeta)
    },
    [],
  )

  useResourceInitialDataCache<ContactRequestRow, AdminContactRequestsListParams>({
    initialData,
    queryClient,
    buildParams: buildInitialParams,
    buildQueryKey: queryKeys.adminContactRequests.list,
    logDebug: logInitialDataCache,
  })

  return (
    <>
      <ResourceTableClient<ContactRequestRow>
        title={CONTACT_REQUEST_LABELS.MANAGE_CONTACT_REQUESTS}
        baseColumns={baseColumns}
        loader={loader}
        viewModes={viewModes}
        defaultViewId="new"
        initialDataByView={initialDataByView}
        fallbackRowCount={6}
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
              : deleteConfirm.type === "restore" || deleteConfirm.type === "mark-read" || deleteConfirm.type === "mark-unread"
              ? "default"
              : "destructive"
          }
          confirmLabel={
            deleteConfirm.type === "hard"
              ? CONTACT_REQUEST_CONFIRM_MESSAGES.HARD_DELETE_LABEL
              : deleteConfirm.type === "restore"
              ? CONTACT_REQUEST_CONFIRM_MESSAGES.RESTORE_LABEL
              : deleteConfirm.type === "mark-read"
              ? CONTACT_REQUEST_CONFIRM_MESSAGES.MARK_READ_LABEL
              : deleteConfirm.type === "mark-unread"
              ? CONTACT_REQUEST_CONFIRM_MESSAGES.MARK_UNREAD_LABEL
              : CONTACT_REQUEST_CONFIRM_MESSAGES.CONFIRM_LABEL
          }
          cancelLabel={CONTACT_REQUEST_CONFIRM_MESSAGES.CANCEL_LABEL}
          onConfirm={handleDeleteConfirm}
          isLoading={
            bulkState.isProcessing ||
            (deleteConfirm.row
              ? deleteConfirm.type === "restore"
                ? restoringRequests.has(deleteConfirm.row.id)
                : deleteConfirm.type === "hard"
                ? hardDeletingRequests.has(deleteConfirm.row.id)
                : deleteConfirm.type === "mark-read"
                ? markingReadRequests.has(deleteConfirm.row.id)
                : deleteConfirm.type === "mark-unread"
                ? markingUnreadRequests.has(deleteConfirm.row.id)
                : deletingRequests.has(deleteConfirm.row.id)
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
