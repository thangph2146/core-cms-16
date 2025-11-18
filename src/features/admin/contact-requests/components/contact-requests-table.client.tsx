"use client"

import { useCallback, useEffect, useMemo, useRef } from "react"
import { RotateCcw, Trash2, AlertTriangle } from "lucide-react"

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

  const tableRefreshRef = useRef<(() => void) | null>(null)
  const tableSoftRefreshRef = useRef<(() => void) | null>(null)
  const pendingRealtimeRefreshRef = useRef(false)

  const {
    handleToggleRead,
    executeSingleAction,
    executeBulkAction,
    togglingRequests,
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
      if (tableRefreshRef.current) {
        handleToggleRead(row, checked, tableRefreshRef.current)
      }
    },
    [handleToggleRead],
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
          await executeSingleAction("delete", row, tableRefreshRef.current || (() => {}))
        },
      })
    },
    [canDelete, executeSingleAction, setDeleteConfirm],
  )

  const handleHardDeleteSingle = useCallback(
    (row: ContactRequestRow) => {
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
    (row: ContactRequestRow) => {
      if (!canRestore) return
      executeSingleAction("restore", row, tableRefreshRef.current || (() => {}))
    },
    [canRestore, executeSingleAction],
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
    const params: AdminContactRequestsListParams = {
      status: "active",
      page: initialData.page,
      limit: initialData.limit,
      search: undefined,
      filters: undefined,
    }
    const queryKey = queryKeys.adminContactRequests.list(params)
    queryClient.setQueryData(queryKey, initialData)
    
    logger.debug("Set initial data to cache", {
      queryKey: queryKey.slice(0, 2),
      rowsCount: initialData.rows.length,
      total: initialData.total,
    })
  }, [initialData, queryClient])

  const loader = useCallback(
    async (query: DataTableQueryState, view: ResourceViewMode<ContactRequestRow>) => {
      const baseUrl = apiRoutes.contactRequests.list({
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

      const response = await apiClient.get<ContactRequestsResponse>(url)
      const payload = response.data

      // Set vào cache với params tương ứng
      const viewStatus = (view.status ?? "active") as "active" | "deleted" | "all"
      const params: AdminContactRequestsListParams = {
        status: viewStatus,
        page: query.page,
        limit: query.limit,
        search: query.search.trim() || undefined,
        filters: Object.keys(query.filters).length > 0 ? query.filters : undefined,
      }
      const queryKey = queryKeys.adminContactRequests.list(params)
      const result: DataTableResult<ContactRequestRow> = {
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


  const viewModes = useMemo<ResourceViewMode<ContactRequestRow>[]>(() => {
    const modes: ResourceViewMode<ContactRequestRow>[] = [
      {
        id: "new",
        label: CONTACT_REQUEST_LABELS.NEW,
        status: "NEW",
        columns: baseColumns,
        selectionEnabled: canDelete || canUpdate,
        selectionActions: canDelete || canUpdate
          ? ({ selectedIds, clearSelection, refresh }) => (
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <span>
                  {CONTACT_REQUEST_LABELS.SELECTED_CONTACT_REQUESTS(selectedIds.length)}
                </span>
                <div className="flex items-center gap-2">
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
                    >
                      <Trash2 className="mr-2 h-5 w-5" />
                      {CONTACT_REQUEST_LABELS.DELETE} ({selectedIds.length})
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
                      {CONTACT_REQUEST_LABELS.HARD_DELETE} ({selectedIds.length})
                    </Button>
                  )}
                  <Button type="button" size="sm" variant="ghost" onClick={clearSelection}>
                    {CONTACT_REQUEST_LABELS.CLEAR_SELECTION}
                  </Button>
                </div>
              </div>
            )
          : undefined,
        rowActions: (row) => renderActiveRowActions(row),
        emptyMessage: "Không tìm thấy yêu cầu liên hệ mới nào",
      },
      {
        id: "active",
        label: CONTACT_REQUEST_LABELS.ACTIVE_VIEW,
        status: "active",
        columns: baseColumns,
        selectionEnabled: canDelete || canUpdate,
        selectionActions: canDelete || canUpdate
          ? ({ selectedIds, clearSelection, refresh }) => (
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <span>
                  {CONTACT_REQUEST_LABELS.SELECTED_CONTACT_REQUESTS(selectedIds.length)}
                </span>
                <div className="flex items-center gap-2">
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
                    >
                      <Trash2 className="mr-2 h-5 w-5" />
                      {CONTACT_REQUEST_LABELS.DELETE} ({selectedIds.length})
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
                      {CONTACT_REQUEST_LABELS.HARD_DELETE} ({selectedIds.length})
                    </Button>
                  )}
                  <Button type="button" size="sm" variant="ghost" onClick={clearSelection}>
                    {CONTACT_REQUEST_LABELS.CLEAR_SELECTION}
                  </Button>
                </div>
              </div>
            )
          : undefined,
        rowActions: (row) => renderActiveRowActions(row),
        emptyMessage: CONTACT_REQUEST_LABELS.NO_CONTACT_REQUESTS,
      },
      {
        id: "deleted",
        label: CONTACT_REQUEST_LABELS.DELETED_VIEW,
        status: "deleted",
        columns: deletedColumns,
        selectionEnabled: canRestore || canManage,
        selectionActions: canRestore || canManage
          ? ({ selectedIds, clearSelection, refresh }) => (
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <span>
                  {CONTACT_REQUEST_LABELS.SELECTED_DELETED_CONTACT_REQUESTS(selectedIds.length)}
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
                      {CONTACT_REQUEST_LABELS.RESTORE} ({selectedIds.length})
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
                      {CONTACT_REQUEST_LABELS.HARD_DELETE} ({selectedIds.length})
                    </Button>
                  )}
                  <Button type="button" size="sm" variant="ghost" onClick={clearSelection}>
                    {CONTACT_REQUEST_LABELS.CLEAR_SELECTION}
                  </Button>
                </div>
              </div>
            )
          : undefined,
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
        onRefreshReady={(refresh) => {
          const wrapped = () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.adminContactRequests.all(), refetchType: "none" })
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
              ? CONTACT_REQUEST_CONFIRM_MESSAGES.HARD_DELETE_TITLE(
                  deleteConfirm.bulkIds?.length,
                  deleteConfirm.row?.subject
                )
              : CONTACT_REQUEST_CONFIRM_MESSAGES.DELETE_TITLE(
                  deleteConfirm.bulkIds?.length,
                  deleteConfirm.row?.subject
                )
            : ""
        }
        description={
          deleteConfirm
            ? deleteConfirm.type === "hard"
              ? CONTACT_REQUEST_CONFIRM_MESSAGES.HARD_DELETE_DESCRIPTION(
                  deleteConfirm.bulkIds?.length,
                  deleteConfirm.row?.subject
                )
              : CONTACT_REQUEST_CONFIRM_MESSAGES.DELETE_DESCRIPTION(
                  deleteConfirm.bulkIds?.length,
                  deleteConfirm.row?.subject
                )
            : ""
        }
        confirmLabel={deleteConfirm ? (deleteConfirm.type === "hard" ? CONTACT_REQUEST_CONFIRM_MESSAGES.HARD_DELETE_LABEL : CONTACT_REQUEST_CONFIRM_MESSAGES.CONFIRM_LABEL) : CONTACT_REQUEST_CONFIRM_MESSAGES.CONFIRM_LABEL}
        cancelLabel={CONTACT_REQUEST_CONFIRM_MESSAGES.CANCEL_LABEL}
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
