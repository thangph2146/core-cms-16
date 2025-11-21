"use client"

import { useCallback, useMemo } from "react"
import { useResourceRouter } from "@/hooks/use-resource-segment"
import { Plus, RotateCcw, Trash2, AlertTriangle } from "lucide-react"

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
import { useUsersSocketBridge } from "@/features/admin/users/hooks/use-users-socket-bridge"
import { useUserActions } from "@/features/admin/users/hooks/use-user-actions"
import { useUserFeedback } from "@/features/admin/users/hooks/use-user-feedback"
import { useUserDeleteConfirm } from "@/features/admin/users/hooks/use-user-delete-confirm"
import { useUserColumns } from "@/features/admin/users/utils/columns"
import { useUserRowActions } from "@/features/admin/users/utils/row-actions"

import type { AdminUsersListParams } from "@/lib/query-keys"
import type { UserRow, UsersResponse, UsersTableClientProps } from "../types"
import { USER_CONFIRM_MESSAGES, USER_LABELS } from "../constants/messages"
import { logger } from "@/lib/config"


export function UsersTableClient({
  canDelete = false,
  canRestore = false,
  canManage = false,
  canCreate = false,
  initialData,
  initialRolesOptions = [],
}: UsersTableClientProps) {
  const queryClient = useQueryClient()
  const router = useResourceRouter()
  const { cacheVersion } = useUsersSocketBridge()
  const { feedback, showFeedback, handleFeedbackOpenChange } = useUserFeedback()
  const { deleteConfirm, setDeleteConfirm, handleDeleteConfirm } = useUserDeleteConfirm()

  const getInvalidateQueryKey = useCallback(() => queryKeys.adminUsers.all(), [])
  const { onRefreshReady, refresh: refreshTable } = useResourceTableRefresh({
    queryClient,
    getInvalidateQueryKey,
    cacheVersion,
  })

  const {
    executeSingleAction,
    executeToggleActive,
    executeBulkAction,
    deletingUsers,
    restoringUsers,
    hardDeletingUsers,
    togglingUsers,
    bulkState,
  } = useUserActions({
    canDelete,
    canRestore,
    canManage,
    showFeedback,
  })

  const handleToggleStatus = useCallback(
    (row: UserRow, newStatus: boolean) => {
      executeToggleActive(row, newStatus, refreshTable)
    },
    [executeToggleActive, refreshTable],
  )

  const { baseColumns, deletedColumns } = useUserColumns({
    rolesOptions: initialRolesOptions,
    canManage,
    togglingUsers,
    onToggleStatus: handleToggleStatus,
    showFeedback,
  })

  const fetchUsers = useCallback(
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
    }): Promise<DataTableResult<UserRow>> => {
      const baseUrl = apiRoutes.users.list({
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
      
      const response = await apiClient.get<UsersResponse>(url)
      const payload = response.data

      if (!payload || !payload.data) {
        throw new Error("Không thể tải danh sách người dùng")
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

  const buildListParams = useCallback(
    ({ query, view }: { query: DataTableQueryState; view: ResourceViewMode<UserRow> }): AdminUsersListParams => {
      const filtersRecord = sanitizeFilters(query.filters)

      return {
        status: (view.status ?? "active") as AdminUsersListParams["status"],
        page: query.page,
        limit: query.limit,
        search: normalizeSearch(query.search),
        filters: Object.keys(filtersRecord).length ? filtersRecord : undefined,
      }
    },
    [],
  )

  const fetchUsersWithDefaults = useCallback(
    (params: AdminUsersListParams) =>
      fetchUsers({
        page: params.page,
        limit: params.limit,
        status: params.status ?? "active",
        search: params.search,
        filters: params.filters,
      }),
    [fetchUsers],
  )

  const loader = useResourceTableLoader<UserRow, AdminUsersListParams>({
    queryClient,
    fetcher: fetchUsersWithDefaults,
    buildParams: buildListParams,
    buildQueryKey: queryKeys.adminUsers.list,
  })

  const handleDeleteSingle = useCallback(
    (row: UserRow) => {
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
    (row: UserRow) => {
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
    (row: UserRow) => {
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

  const { renderActiveRowActions, renderDeletedRowActions } = useUserRowActions({
    canDelete,
    canRestore,
    canManage,
    onDelete: handleDeleteSingle,
    onHardDelete: handleHardDeleteSingle,
    onRestore: handleRestoreSingle,
    deletingUsers,
    restoringUsers,
    hardDeletingUsers,
  })

  const executeBulk = useCallback(
    (action: "delete" | "restore" | "hard-delete", ids: string[], selectedRows: UserRow[], refresh: () => void, clearSelection: () => void) => {
      if (ids.length === 0) return

      // Actions cần confirmation
      if (action === "delete" || action === "restore" || action === "hard-delete") {
        setDeleteConfirm({
          open: true,
          type: action === "hard-delete" ? "hard" : action === "restore" ? "restore" : "soft",
          bulkIds: ids,
          onConfirm: async () => {
            await executeBulkAction(action, ids, selectedRows, refresh, clearSelection)
          },
        })
      } else {
        executeBulkAction(action, ids, selectedRows, refresh, clearSelection)
      }
    },
    [executeBulkAction, setDeleteConfirm],
  )

  const buildInitialParams = useCallback(
    (data: DataTableResult<UserRow>): AdminUsersListParams => ({
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

  useResourceInitialDataCache<UserRow, AdminUsersListParams>({
    initialData,
    queryClient,
    buildParams: buildInitialParams,
    buildQueryKey: queryKeys.adminUsers.list,
    logDebug: logInitialDataCache,
  })

  const viewModes = useMemo<ResourceViewMode<UserRow>[]>(() => {
    const modes: ResourceViewMode<UserRow>[] = [
      {
        id: "active",
        label: USER_LABELS.ACTIVE_VIEW,
        status: "active",
        selectionEnabled: canDelete,
        selectionActions: canDelete
          ? ({ selectedIds, selectedRows, clearSelection, refresh }) => {
              // Filter ra super admin từ danh sách đã chọn
              const deletableRows = selectedRows.filter((row) => row.email !== "superadmin@hub.edu.vn")
              const hasSuperAdmin = selectedRows.some((row) => row.email === "superadmin@hub.edu.vn")
              
              return (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm">
                  <div className="flex-shrink-0">
                    <span className="block sm:inline">
                      {USER_LABELS.SELECTED_USERS(selectedIds.length)}
                    </span>
                    {hasSuperAdmin && (
                      <span className="block sm:inline ml-0 sm:ml-2 mt-1 sm:mt-0 text-xs text-muted-foreground">
                        (Tài khoản super admin không thể xóa)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={bulkState.isProcessing || deletableRows.length === 0}
                      onClick={() => executeBulk("delete", deletableRows.map((r) => r.id), deletableRows, refresh, clearSelection)}
                      className="whitespace-nowrap"
                    >
                      <Trash2 className="mr-2 h-5 w-5 shrink-0" />
                      <span className="hidden sm:inline">
                        {USER_LABELS.DELETE_SELECTED(deletableRows.length)}
                      </span>
                      <span className="sm:hidden">Xóa</span>
                    </Button>
                    {canManage && (
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={bulkState.isProcessing || deletableRows.length === 0}
                        onClick={() => executeBulk("hard-delete", deletableRows.map((r) => r.id), deletableRows, refresh, clearSelection)}
                        className="whitespace-nowrap"
                      >
                        <AlertTriangle className="mr-2 h-5 w-5 shrink-0" />
                        <span className="hidden sm:inline">
                          {USER_LABELS.HARD_DELETE_SELECTED(deletableRows.length)}
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
                      {USER_LABELS.CLEAR_SELECTION}
                    </Button>
                  </div>
                </div>
              )
            }
          : undefined,
        rowActions: (row) => renderActiveRowActions(row),
        emptyMessage: USER_LABELS.NO_USERS,
      },
      {
        id: "deleted",
        label: USER_LABELS.DELETED_VIEW,
        status: "deleted",
        columns: deletedColumns,
        selectionEnabled: canRestore || canManage,
        selectionActions: canRestore || canManage
          ? ({ selectedIds, selectedRows, clearSelection, refresh }) => (
              <SelectionActionsWrapper
                label={USER_LABELS.SELECTED_DELETED_USERS(selectedIds.length)}
                actions={
                  <>
                  {canRestore && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                        disabled={bulkState.isProcessing || selectedIds.length === 0}
                        onClick={() => executeBulk("restore", selectedIds, selectedRows, refresh, clearSelection)}
                        className="whitespace-nowrap"
                      >
                        <RotateCcw className="mr-2 h-5 w-5 shrink-0" />
                        <span className="hidden sm:inline">
                          {USER_LABELS.RESTORE_SELECTED(selectedIds.length)}
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
                        onClick={() => executeBulk("hard-delete", selectedIds, selectedRows, refresh, clearSelection)}
                        className="whitespace-nowrap"
                      >
                        <AlertTriangle className="mr-2 h-5 w-5 shrink-0" />
                        <span className="hidden sm:inline">
                          {USER_LABELS.HARD_DELETE_SELECTED(selectedIds.length)}
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
                      {USER_LABELS.CLEAR_SELECTION}
                    </Button>
                  </>
                }
              />
            )
          : undefined,
        rowActions: (row) => renderDeletedRowActions(row),
        emptyMessage: USER_LABELS.NO_DELETED_USERS,
      },
    ]

    return modes
  }, [
    canDelete,
    canRestore,
    canManage,
    deletedColumns,
    executeBulk,
    bulkState.isProcessing,
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
      return USER_CONFIRM_MESSAGES.HARD_DELETE_TITLE(
        deleteConfirm.bulkIds?.length,
      )
    }
    if (deleteConfirm.type === "restore") {
      return USER_CONFIRM_MESSAGES.RESTORE_TITLE(
        deleteConfirm.bulkIds?.length,
      )
    }
    return USER_CONFIRM_MESSAGES.DELETE_TITLE(deleteConfirm.bulkIds?.length)
  }

  const getDeleteConfirmDescription = () => {
    if (!deleteConfirm) return ""
    if (deleteConfirm.type === "hard") {
      return USER_CONFIRM_MESSAGES.HARD_DELETE_DESCRIPTION(
        deleteConfirm.bulkIds?.length,
        deleteConfirm.row?.email,
      )
    }
    if (deleteConfirm.type === "restore") {
      return USER_CONFIRM_MESSAGES.RESTORE_DESCRIPTION(
        deleteConfirm.bulkIds?.length,
        deleteConfirm.row?.email,
      )
    }
    return USER_CONFIRM_MESSAGES.DELETE_DESCRIPTION(
      deleteConfirm.bulkIds?.length,
      deleteConfirm.row?.email,
    )
  }

  const headerActions = canCreate ? (
    <Button
      type="button"
      size="sm"
      onClick={() => router.push("/admin/users/new")}
      className="h-8 px-3 text-xs sm:text-sm"
    >
      <Plus className="mr-2 h-5 w-5" />
      {USER_LABELS.ADD_NEW}
    </Button>
  ) : undefined

  return (
    <>
      <ResourceTableClient<UserRow>
        title={USER_LABELS.MANAGE_USERS}
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
              ? USER_CONFIRM_MESSAGES.HARD_DELETE_LABEL 
              : deleteConfirm.type === "restore"
              ? USER_CONFIRM_MESSAGES.RESTORE_LABEL
              : USER_CONFIRM_MESSAGES.CONFIRM_LABEL
          }
          cancelLabel={USER_CONFIRM_MESSAGES.CANCEL_LABEL}
          onConfirm={handleDeleteConfirm}
          isLoading={
            bulkState.isProcessing ||
            (deleteConfirm.row
              ? deleteConfirm.type === "restore"
                ? restoringUsers.has(deleteConfirm.row.id)
                : deleteConfirm.type === "hard"
                ? hardDeletingUsers.has(deleteConfirm.row.id)
                : deletingUsers.has(deleteConfirm.row.id)
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

