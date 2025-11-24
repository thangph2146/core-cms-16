"use client"

import { useCallback, useMemo, useState } from "react"
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
  useResourceTableLoader,
  useResourceTableRefresh,
  useResourceTableLogger,
} from "@/features/admin/resources/hooks"
import { normalizeSearch, sanitizeFilters } from "@/features/admin/resources/utils"
import { apiClient } from "@/lib/api/axios"
import { apiRoutes } from "@/lib/api/routes"
import { useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"
import { sanitizeSearchQuery } from "@/lib/api/validation"
import { useRolesSocketBridge } from "@/features/admin/roles/hooks/use-roles-socket-bridge"
import { useRoleActions } from "@/features/admin/roles/hooks/use-role-actions"
import { useRoleFeedback } from "@/features/admin/roles/hooks/use-role-feedback"
import { useRoleDeleteConfirm } from "@/features/admin/roles/hooks/use-role-delete-confirm"
import { useRoleColumns } from "@/features/admin/roles/utils/columns"
import { useRoleRowActions } from "@/features/admin/roles/utils/row-actions"
import { resourceLogger } from "@/lib/config"

import type { AdminRolesListParams } from "@/lib/query-keys"
import type { RoleRow, RolesResponse, RolesTableClientProps } from "../types"
import { ROLE_CONFIRM_MESSAGES, ROLE_LABELS } from "../constants/messages"
export function RolesTableClient({
  canDelete = false,
  canRestore = false,
  canManage = false,
  canCreate = false,
  initialData,
  initialPermissionsOptions: _initialPermissionsOptions = [],
}: RolesTableClientProps) {
  const queryClient = useQueryClient()
  const { isSocketConnected, cacheVersion } = useRolesSocketBridge()
  const { feedback, showFeedback, handleFeedbackOpenChange } = useRoleFeedback()
  const { deleteConfirm, setDeleteConfirm, handleDeleteConfirm } = useRoleDeleteConfirm()

  // Track current view để log khi view thay đổi
  const [currentViewId, setCurrentViewId] = useState<string>("active")

  // Log table structure khi data thay đổi sau refetch hoặc khi view thay đổi
  useResourceTableLogger<RoleRow>({
    resourceName: "roles",
    initialData,
    initialDataByView: initialData ? { active: initialData } : undefined,
    currentViewId,
    queryClient,
    buildQueryKey: (params) => queryKeys.adminRoles.list({
      ...params,
      search: undefined,
      filters: undefined,
    }),
    columns: ["id", "name", "displayName", "description", "isActive", "createdAt", "deletedAt"],
    getRowData: (row) => ({
      id: row.id,
      name: row.name,
      displayName: row.displayName,
      description: row.description,
      isActive: row.isActive,
      createdAt: row.createdAt,
      deletedAt: row.deletedAt,
    }),
    cacheVersion,
  })

  const getInvalidateQueryKey = useCallback(() => queryKeys.adminRoles.all(), [])
  const { onRefreshReady, refresh: refreshTable } = useResourceTableRefresh({
    queryClient,
    getInvalidateQueryKey,
    cacheVersion,
  })

  const {
    handleToggleStatus,
    executeSingleAction,
    executeBulkAction,
    togglingRoles,
    deletingRoles,
    restoringRoles,
    hardDeletingRoles,
    bulkState,
  } = useRoleActions({
    canDelete,
    canRestore,
    canManage,
    isSocketConnected,
    showFeedback,
  })

  const handleToggleStatusWithRefresh = useCallback(
    (row: RoleRow, checked: boolean) => {
      handleToggleStatus(row, checked, refreshTable)
    },
    [handleToggleStatus, refreshTable],
  )

  const { baseColumns, deletedColumns } = useRoleColumns({
    togglingRoles,
    canManage,
    onToggleStatus: handleToggleStatusWithRefresh,
  })

  const handleDeleteSingle = useCallback(
    (row: RoleRow) => {
      if (!canDelete) return
      if (row.name === "super_admin") {
        showFeedback("error", ROLE_LABELS.CANNOT_DELETE, ROLE_LABELS.CANNOT_DELETE_SUPER_ADMIN)
        return
      }
      setDeleteConfirm({
        open: true,
        type: "soft",
        row,
        onConfirm: async () => {
          await executeSingleAction("delete", row, refreshTable)
        },
      })
    },
    [canDelete, executeSingleAction, refreshTable, setDeleteConfirm, showFeedback],
  )

  const handleHardDeleteSingle = useCallback(
    (row: RoleRow) => {
      if (!canManage) return
      if (row.name === "super_admin") {
        showFeedback("error", ROLE_LABELS.CANNOT_DELETE, ROLE_LABELS.CANNOT_HARD_DELETE_SUPER_ADMIN)
        return
      }
      setDeleteConfirm({
        open: true,
        type: "hard",
        row,
        onConfirm: async () => {
          await executeSingleAction("hard-delete", row, refreshTable)
        },
      })
    },
    [canManage, executeSingleAction, refreshTable, setDeleteConfirm, showFeedback],
  )

  const handleRestoreSingle = useCallback(
    (row: RoleRow) => {
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

  const { renderActiveRowActions, renderDeletedRowActions } = useRoleRowActions({
    canDelete,
    canRestore,
    canManage,
    onDelete: handleDeleteSingle,
    onHardDelete: handleHardDeleteSingle,
    onRestore: handleRestoreSingle,
    deletingRoles,
    restoringRoles,
    hardDeletingRoles,
  })

  const fetchRoles = useCallback(
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
    }): Promise<DataTableResult<RoleRow>> => {
      const safePage = Number.isFinite(page) && page > 0 ? page : 1
      const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : 10
      const trimmedSearch = typeof search === "string" ? search.trim() : ""
      const searchValidation =
        trimmedSearch.length > 0 ? sanitizeSearchQuery(trimmedSearch, 200) : { valid: true, value: "" }
      if (!searchValidation.valid) {
        throw new Error(searchValidation.error || "Từ khóa tìm kiếm không hợp lệ. Vui lòng thử lại.")
      }

      const requestParams: Record<string, string> = {
        page: safePage.toString(),
        limit: safeLimit.toString(),
        status: status ?? "active",
      }
      if (searchValidation.value) {
        requestParams.search = searchValidation.value
      }

      Object.entries(filters ?? {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          const normalized = `${value}`.trim()
          if (normalized) {
            const filterValidation = sanitizeSearchQuery(normalized, 100)
            if (filterValidation.valid && filterValidation.value) {
              requestParams[`filter[${key}]`] = filterValidation.value
            } else if (!filterValidation.valid) {
              throw new Error(filterValidation.error || "Giá trị bộ lọc không hợp lệ. Vui lòng thử lại.")
            }
          }
        }
      })

      try {
        const response = await apiClient.get<{
          success: boolean
          data?: RolesResponse
          error?: string
          message?: string
        }>(apiRoutes.roles.list(), {
          params: requestParams,
        })

        const payload = response.data.data
        if (!payload) {
          throw new Error(response.data.error || response.data.message || "Không thể tải danh sách vai trò")
        }

        const result = {
          rows: payload.data ?? [],
          page: payload.pagination?.page ?? page,
          limit: payload.pagination?.limit ?? limit,
          total: payload.pagination?.total ?? payload.data?.length ?? 0,
          totalPages: payload.pagination?.totalPages ?? 0,
        }

        // Log table action và data structure
        resourceLogger.tableAction({
          resource: "roles",
          action: "load-table",
          view: status,
          page: result.page,
          total: result.total,
        })

        resourceLogger.dataStructure({
          resource: "roles",
          dataType: "table",
          structure: {
            columns: result.rows.length > 0 ? Object.keys(result.rows[0]) : [],
            pagination: {
              page: result.page,
              limit: result.limit,
              total: result.total,
              totalPages: result.totalPages,
            },
            sampleRows: result.rows.map((row) => row as unknown as Record<string, unknown>), // Hiển thị đầy đủ rows hiện tại
          },
          rowCount: result.rows.length,
        })

        return result
      } catch (error: unknown) {
        // Log chi tiết lỗi để debug
        if (error && typeof error === "object" && "response" in error) {
          const axiosError = error as { response?: { data?: unknown; status?: number } }
          const errorMessage = axiosError.response?.data
            ? typeof axiosError.response.data === "object" && "error" in axiosError.response.data
              ? String(axiosError.response.data.error)
              : JSON.stringify(axiosError.response.data)
            : `Request failed with status ${axiosError.response?.status ?? "unknown"}`
          throw new Error(errorMessage)
        }
        throw error
      }
    },
    [],
  )

  const buildListParams = useCallback(
    ({ query, view }: { query: DataTableQueryState; view: ResourceViewMode<RoleRow> }): AdminRolesListParams => {
      const filtersRecord = sanitizeFilters(query.filters)
      const normalizedSearch = normalizeSearch(query.search)
      const sanitizedSearch =
        normalizedSearch && normalizedSearch.length > 0
          ? sanitizeSearchQuery(normalizedSearch).value || undefined
          : undefined

      return {
        status: (view.status ?? "active") as AdminRolesListParams["status"],
        page: query.page,
        limit: query.limit,
        search: sanitizedSearch,
        filters: Object.keys(filtersRecord).length ? filtersRecord : undefined,
      }
    },
    [],
  )

  const fetchRolesWithDefaults = useCallback(
    (params: AdminRolesListParams) =>
      fetchRoles({
        page: params.page,
        limit: params.limit,
        status: params.status ?? "active",
        search: params.search,
        filters: params.filters,
      }),
    [fetchRoles],
  )

  const loader = useResourceTableLoader<RoleRow, AdminRolesListParams>({
    queryClient,
    fetcher: fetchRolesWithDefaults,
    buildParams: buildListParams,
    buildQueryKey: queryKeys.adminRoles.list,
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

  const _buildInitialParams = useCallback(
    (data: DataTableResult<RoleRow>): AdminRolesListParams => ({
      status: "active",
      page: data.page,
      limit: data.limit,
      search: undefined,
      filters: undefined,
    }),
    [],
  )

  // Theo chuẩn Next.js 16: không cache admin data - luôn fetch fresh data từ API
  // Không cần useResourceInitialDataCache nữa

  const createActiveSelectionActions = useCallback(
    ({
      selectedIds,
      selectedRows,
      clearSelection,
      refresh,
    }: {
      selectedIds: string[]
      selectedRows: RoleRow[]
      clearSelection: () => void
      refresh: () => void
    }) => {
      const deletableRows = selectedRows.filter((row) => row.name !== "super_admin")
      const hasSuperAdmin = selectedRows.some((row) => row.name === "super_admin")

      return (
        <SelectionActionsWrapper
          label={ROLE_LABELS.SELECTED_ROLES(selectedIds.length)}
          labelSuffix={
            hasSuperAdmin ? <>{ROLE_LABELS.CANNOT_DELETE_SUPER_ADMIN_HINT}</> : undefined
          }
          actions={
            <>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={bulkState.isProcessing || deletableRows.length === 0}
                onClick={() =>
                  executeBulk(
                    "delete",
                    deletableRows.map((row) => row.id),
                    refresh,
                    clearSelection,
                  )
                }
                className="whitespace-nowrap"
              >
                <Trash2 className="mr-2 h-5 w-5 shrink-0" />
                <span className="hidden sm:inline">
                  {ROLE_LABELS.DELETE_SELECTED(deletableRows.length)}
                </span>
                <span className="sm:hidden">Xóa</span>
              </Button>
              {canManage && (
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={bulkState.isProcessing || deletableRows.length === 0}
                  onClick={() =>
                    executeBulk(
                      "hard-delete",
                      deletableRows.map((row) => row.id),
                      refresh,
                      clearSelection,
                    )
                  }
                  className="whitespace-nowrap"
                >
                  <AlertTriangle className="mr-2 h-5 w-5 shrink-0" />
                  <span className="hidden sm:inline">
                    {ROLE_LABELS.HARD_DELETE_SELECTED(deletableRows.length)}
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
                {ROLE_LABELS.CLEAR_SELECTION}
              </Button>
            </>
          }
        />
      )
    },
    [bulkState.isProcessing, canManage, executeBulk],
  )

  const createDeletedSelectionActions = useCallback(
    ({
      selectedIds,
      selectedRows,
      clearSelection,
      refresh,
    }: {
      selectedIds: string[]
      selectedRows: RoleRow[]
      clearSelection: () => void
      refresh: () => void
    }) => {
      const deletableRows = selectedRows.filter((row) => row.name !== "super_admin")
      const hasSuperAdmin = selectedRows.some((row) => row.name === "super_admin")

      return (
        <SelectionActionsWrapper
          label={ROLE_LABELS.SELECTED_DELETED_ROLES(selectedIds.length)}
          labelSuffix={
            hasSuperAdmin ? <>{ROLE_LABELS.CANNOT_HARD_DELETE_SUPER_ADMIN_HINT}</> : undefined
          }
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
                    {ROLE_LABELS.RESTORE_SELECTED(selectedIds.length)}
                  </span>
                  <span className="sm:hidden">Khôi phục</span>
                </Button>
              )}
              {canManage && (
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={bulkState.isProcessing || deletableRows.length === 0}
                  onClick={() =>
                    executeBulk(
                      "hard-delete",
                      deletableRows.map((row) => row.id),
                      refresh,
                      clearSelection,
                    )
                  }
                  className="whitespace-nowrap"
                >
                  <AlertTriangle className="mr-2 h-5 w-5 shrink-0" />
                  <span className="hidden sm:inline">
                    {ROLE_LABELS.HARD_DELETE_SELECTED(deletableRows.length)}
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
                {ROLE_LABELS.CLEAR_SELECTION}
              </Button>
            </>
          }
        />
      )
    },
    [bulkState.isProcessing, canManage, canRestore, executeBulk],
  )

  const viewModes = useMemo<ResourceViewMode<RoleRow>[]>(() => {
    const modes: ResourceViewMode<RoleRow>[] = [
      {
        id: "active",
        label: ROLE_LABELS.ACTIVE_VIEW,
        status: "active",
        columns: baseColumns,
        selectionEnabled: canDelete,
        selectionActions: canDelete ? createActiveSelectionActions : undefined,
        rowActions: (row) => renderActiveRowActions(row),
        emptyMessage: ROLE_LABELS.NO_ROLES,
      },
      {
        id: "deleted",
        label: ROLE_LABELS.DELETED_VIEW,
        status: "deleted",
        columns: deletedColumns,
        selectionEnabled: canRestore || canManage,
        selectionActions: canRestore || canManage ? createDeletedSelectionActions : undefined,
        rowActions: (row) => renderDeletedRowActions(row),
        emptyMessage: ROLE_LABELS.NO_DELETED_ROLES,
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
      return ROLE_CONFIRM_MESSAGES.HARD_DELETE_TITLE(
        deleteConfirm.bulkIds?.length,
      )
    }
    if (deleteConfirm.type === "restore") {
      return ROLE_CONFIRM_MESSAGES.RESTORE_TITLE(
        deleteConfirm.bulkIds?.length,
      )
    }
    return ROLE_CONFIRM_MESSAGES.DELETE_TITLE(deleteConfirm.bulkIds?.length)
  }

  const getDeleteConfirmDescription = () => {
    if (!deleteConfirm) return ""
    if (deleteConfirm.type === "hard") {
      return ROLE_CONFIRM_MESSAGES.HARD_DELETE_DESCRIPTION(
        deleteConfirm.bulkIds?.length,
        deleteConfirm.row?.displayName,
      )
    }
    if (deleteConfirm.type === "restore") {
      return ROLE_CONFIRM_MESSAGES.RESTORE_DESCRIPTION(
        deleteConfirm.bulkIds?.length,
        deleteConfirm.row?.displayName,
      )
    }
    return ROLE_CONFIRM_MESSAGES.DELETE_DESCRIPTION(
      deleteConfirm.bulkIds?.length,
      deleteConfirm.row?.displayName,
    )
  }

  const router = useResourceRouter()

  const headerActions = canCreate ? (
    <Button
      type="button"
      size="sm"
      onClick={() => router.push("/admin/roles/new")}
      className="h-8 px-3 text-xs sm:text-sm"
    >
      <Plus className="mr-2 h-5 w-5" />
      {ROLE_LABELS.ADD_NEW}
    </Button>
  ) : undefined

  return (
    <>
      <ResourceTableClient<RoleRow>
        title={ROLE_LABELS.MANAGE_ROLES}
        baseColumns={baseColumns}
        loader={loader}
        viewModes={viewModes}
        defaultViewId="active"
        initialDataByView={initialDataByView}
        fallbackRowCount={6}
        headerActions={headerActions}
        onRefreshReady={onRefreshReady}
        onViewChange={setCurrentViewId}
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
              ? ROLE_CONFIRM_MESSAGES.HARD_DELETE_LABEL
              : deleteConfirm.type === "restore"
              ? ROLE_CONFIRM_MESSAGES.RESTORE_LABEL
              : ROLE_CONFIRM_MESSAGES.CONFIRM_LABEL
          }
          cancelLabel={ROLE_CONFIRM_MESSAGES.CANCEL_LABEL}
          onConfirm={handleDeleteConfirm}
          isLoading={
            bulkState.isProcessing ||
            (deleteConfirm.row
              ? deleteConfirm.type === "restore"
                ? restoringRoles.has(deleteConfirm.row.id)
                : deleteConfirm.type === "hard"
                ? hardDeletingRoles.has(deleteConfirm.row.id)
                : deletingRoles.has(deleteConfirm.row.id)
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
