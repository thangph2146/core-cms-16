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
import { queryKeys, type AdminCategoriesListParams } from "@/lib/query-keys"
import { useCategoriesSocketBridge } from "../hooks/use-categories-socket-bridge"
import { useCategoryActions } from "../hooks/use-category-actions"
import { useCategoryFeedback } from "../hooks/use-category-feedback"
import { useCategoryDeleteConfirm } from "../hooks/use-category-delete-confirm"
import { useCategoryColumns } from "../utils/columns"
import { useCategoryRowActions } from "../utils/row-actions"

import type { CategoryRow, CategoriesResponse, CategoriesTableClientProps } from "../types"
import { CATEGORY_CONFIRM_MESSAGES, CATEGORY_LABELS } from "../constants/messages"
import { logger } from "@/lib/config"

export function CategoriesTableClient({
  canDelete = false,
  canRestore = false,
  canManage = false,
  canCreate = false,
  initialData,
}: CategoriesTableClientProps) {
  const router = useResourceRouter()
  const queryClient = useQueryClient()
  const { feedback, showFeedback, handleFeedbackOpenChange } = useCategoryFeedback()
  const { deleteConfirm, setDeleteConfirm, handleDeleteConfirm } = useCategoryDeleteConfirm()

  const { cacheVersion } = useCategoriesSocketBridge()
  const getInvalidateQueryKey = useCallback(() => queryKeys.adminCategories.all(), [])
  const { onRefreshReady, refresh: refreshTable } = useResourceTableRefresh({
    queryClient,
    getInvalidateQueryKey,
    cacheVersion,
  })

  const {
    executeSingleAction,
    executeBulkAction,
    deletingCategories,
    restoringCategories,
    hardDeletingCategories,
    bulkState,
  } = useCategoryActions({
    canDelete,
    canRestore,
    canManage,
    showFeedback,
  })

  const { baseColumns, deletedColumns } = useCategoryColumns()

  const handleDeleteSingle = useCallback(
    (row: CategoryRow) => {
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
    (row: CategoryRow) => {
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
    (row: CategoryRow) => {
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

  const { renderActiveRowActions, renderDeletedRowActions } = useCategoryRowActions({
    canDelete,
    canRestore,
    canManage,
    onDelete: handleDeleteSingle,
    onHardDelete: handleHardDeleteSingle,
    onRestore: handleRestoreSingle,
    deletingCategories,
    restoringCategories,
    hardDeletingCategories,
  })

  const fetchCategories = useCallback(
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
    }): Promise<DataTableResult<CategoryRow>> => {
      const baseUrl = apiRoutes.categories.list({
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

      const response = await apiClient.get<{
        success: boolean
        data?: CategoriesResponse
        error?: string
        message?: string
      }>(url)

      const payload = response.data.data
      if (!payload) {
        throw new Error(response.data.error || response.data.message || "Không thể tải danh sách danh mục")
      }

      return {
        rows: payload.data ?? [],
        page: payload.pagination?.page ?? page,
        limit: payload.pagination?.limit ?? limit,
        total: payload.pagination?.total ?? payload.data?.length ?? 0,
        totalPages: payload.pagination?.totalPages ?? 0,
      }
    },
    [],
  )

  const buildListParams = useCallback(
    ({ query, view }: { query: DataTableQueryState; view: ResourceViewMode<CategoryRow> }): AdminCategoriesListParams => {
      const filtersRecord = sanitizeFilters(query.filters)

      return {
        status: (view.status ?? "active") as AdminCategoriesListParams["status"],
        page: query.page,
        limit: query.limit,
        search: normalizeSearch(query.search),
        filters: Object.keys(filtersRecord).length ? filtersRecord : undefined,
      }
    },
    [],
  )

  const fetchCategoriesWithDefaults = useCallback(
    (params: AdminCategoriesListParams) =>
      fetchCategories({
        page: params.page,
        limit: params.limit,
        status: params.status ?? "active",
        search: params.search,
        filters: params.filters,
      }),
    [fetchCategories],
  )

  const loader = useResourceTableLoader<CategoryRow, AdminCategoriesListParams>({
    queryClient,
    fetcher: fetchCategoriesWithDefaults,
    buildParams: buildListParams,
    buildQueryKey: queryKeys.adminCategories.list,
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

  const buildInitialParams = useCallback(
    (data: DataTableResult<CategoryRow>): AdminCategoriesListParams => ({
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

  useResourceInitialDataCache<CategoryRow, AdminCategoriesListParams>({
    initialData,
    queryClient,
    buildParams: buildInitialParams,
    buildQueryKey: queryKeys.adminCategories.list,
    logDebug: logInitialDataCache,
  })

  // Helper function for active view selection actions
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
        label={CATEGORY_LABELS.SELECTED_CATEGORIES(selectedIds.length)}
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
                  {CATEGORY_LABELS.DELETE_SELECTED(selectedIds.length)}
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
                  {CATEGORY_LABELS.HARD_DELETE_SELECTED(selectedIds.length)}
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
              {CATEGORY_LABELS.CLEAR_SELECTION}
            </Button>
          </>
        }
      />
    ),
    [canDelete, canManage, bulkState.isProcessing, executeBulk],
  )

  // Helper function for deleted view selection actions
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
        label={CATEGORY_LABELS.SELECTED_DELETED_CATEGORIES(selectedIds.length)}
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
                  {CATEGORY_LABELS.RESTORE_SELECTED(selectedIds.length)}
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
                  {CATEGORY_LABELS.HARD_DELETE_SELECTED(selectedIds.length)}
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
              {CATEGORY_LABELS.CLEAR_SELECTION}
            </Button>
          </>
        }
      />
    ),
    [canRestore, canManage, bulkState.isProcessing, executeBulk],
  )

  const viewModes = useMemo<ResourceViewMode<CategoryRow>[]>(() => {
    const modes: ResourceViewMode<CategoryRow>[] = [
      {
        id: "active",
        label: CATEGORY_LABELS.ACTIVE_VIEW,
        status: "active",
        columns: baseColumns,
        selectionEnabled: canDelete || canManage,
        selectionActions: canDelete || canManage ? createActiveSelectionActions : undefined,
        rowActions: (row) => renderActiveRowActions(row),
        emptyMessage: CATEGORY_LABELS.NO_CATEGORIES,
      },
      {
        id: "deleted",
        label: CATEGORY_LABELS.DELETED_VIEW,
        status: "deleted",
        columns: deletedColumns,
        selectionEnabled: canRestore || canManage,
        selectionActions: canRestore || canManage ? createDeletedSelectionActions : undefined,
        rowActions: (row) => renderDeletedRowActions(row),
        emptyMessage: CATEGORY_LABELS.NO_DELETED_CATEGORIES,
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
      return CATEGORY_CONFIRM_MESSAGES.HARD_DELETE_TITLE(
        deleteConfirm.bulkIds?.length,
      )
    }
    if (deleteConfirm.type === "restore") {
      return CATEGORY_CONFIRM_MESSAGES.RESTORE_TITLE(
        deleteConfirm.bulkIds?.length,
      )
    }
    return CATEGORY_CONFIRM_MESSAGES.DELETE_TITLE(deleteConfirm.bulkIds?.length)
  }

  const getDeleteConfirmDescription = () => {
    if (!deleteConfirm) return ""
    if (deleteConfirm.type === "hard") {
      return CATEGORY_CONFIRM_MESSAGES.HARD_DELETE_DESCRIPTION(
        deleteConfirm.bulkIds?.length,
        deleteConfirm.row?.name,
      )
    }
    if (deleteConfirm.type === "restore") {
      return CATEGORY_CONFIRM_MESSAGES.RESTORE_DESCRIPTION(
        deleteConfirm.bulkIds?.length,
        deleteConfirm.row?.name,
      )
    }
    return CATEGORY_CONFIRM_MESSAGES.DELETE_DESCRIPTION(
      deleteConfirm.bulkIds?.length,
      deleteConfirm.row?.name,
    )
  }

  const headerActions = canCreate ? (
    <Button
      type="button"
      size="sm"
      onClick={() => router.push("/admin/categories/new")}
      className="h-8 px-3 text-xs sm:text-sm"
    >
      <Plus className="mr-2 h-5 w-5" />
      {CATEGORY_LABELS.ADD_NEW}
    </Button>
  ) : undefined

  return (
    <>
      <ResourceTableClient<CategoryRow>
        title={CATEGORY_LABELS.MANAGE_CATEGORIES}
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
              ? CATEGORY_CONFIRM_MESSAGES.HARD_DELETE_LABEL
              : deleteConfirm.type === "restore"
              ? CATEGORY_CONFIRM_MESSAGES.RESTORE_LABEL
              : CATEGORY_CONFIRM_MESSAGES.CONFIRM_LABEL
          }
          cancelLabel={CATEGORY_CONFIRM_MESSAGES.CANCEL_LABEL}
          onConfirm={handleDeleteConfirm}
          isLoading={
            bulkState.isProcessing ||
            (deleteConfirm.row
              ? deleteConfirm.type === "restore"
                ? restoringCategories.has(deleteConfirm.row.id)
                : deleteConfirm.type === "hard"
                ? hardDeletingCategories.has(deleteConfirm.row.id)
                : deletingCategories.has(deleteConfirm.row.id)
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
