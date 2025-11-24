"use client"

import { useCallback, useMemo, useEffect, useRef, useState } from "react"
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
import { resourceLogger } from "@/lib/config"
import { useTagsSocketBridge } from "@/features/admin/tags/hooks/use-tags-socket-bridge"
import { useTagActions } from "@/features/admin/tags/hooks/use-tag-actions"
import { useTagFeedback } from "@/features/admin/tags/hooks/use-tag-feedback"
import { useTagDeleteConfirm } from "@/features/admin/tags/hooks/use-tag-delete-confirm"
import { useTagColumns } from "@/features/admin/tags/utils/columns"
import { useTagRowActions } from "@/features/admin/tags/utils/row-actions"

import type { AdminTagsListParams } from "@/lib/query-keys"
import type { TagRow, TagsResponse, TagsTableClientProps } from "../types"
import { TAG_CONFIRM_MESSAGES, TAG_LABELS } from "../constants/messages"

export function TagsTableClient({
  canDelete = false,
  canRestore = false,
  canManage = false,
  canCreate = false,
  initialData,
}: TagsTableClientProps) {
  const queryClient = useQueryClient()
  const { cacheVersion, isSocketConnected } = useTagsSocketBridge()
  const { feedback, showFeedback, handleFeedbackOpenChange } = useTagFeedback()
  const { deleteConfirm, setDeleteConfirm, handleDeleteConfirm } = useTagDeleteConfirm()

  // Track current view để log khi view thay đổi
  const [currentViewId, setCurrentViewId] = useState<string>("active")

  // Log table structure khi data thay đổi sau refetch hoặc khi view thay đổi
  useResourceTableLogger<TagRow>({
    resourceName: "tags",
    initialData,
    initialDataByView: initialData ? { active: initialData } : undefined,
    currentViewId,
    queryClient,
    buildQueryKey: (params) => queryKeys.adminTags.list({
      ...params,
      search: undefined,
      filters: undefined,
    }),
    columns: ["id", "name", "slug", "createdAt", "deletedAt"],
    getRowData: (row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      createdAt: row.createdAt,
      deletedAt: row.deletedAt,
    }),
    cacheVersion,
  })

  const getInvalidateQueryKey = useCallback(() => queryKeys.adminTags.all(), [])
  const { onRefreshReady, refresh: refreshTable } = useResourceTableRefresh({
    queryClient,
    getInvalidateQueryKey,
    cacheVersion,
  })

  const {
    executeSingleAction,
    executeBulkAction,
    deletingIds: deletingTags,
    restoringIds: restoringTags,
    hardDeletingIds: hardDeletingTags,
    bulkState,
  } = useTagActions({
    canDelete,
    canRestore,
    canManage,
    isSocketConnected,
    showFeedback,
  })

  const { baseColumns, deletedColumns } = useTagColumns()

  const handleDeleteSingle = useCallback(
    (row: TagRow) => {
      if (!canDelete) return
      resourceLogger.tableAction({
        resource: "tags",
        action: "delete",
        resourceId: row.id,
        tagName: row.name,
      })
      setDeleteConfirm({
        open: true,
        type: "soft",
        row,
        onConfirm: async () => {
          await executeSingleAction("delete", row, refreshTable)
        },
      })
    },
    [canDelete, executeSingleAction, setDeleteConfirm, refreshTable],
  )

  const handleHardDeleteSingle = useCallback(
    (row: TagRow) => {
      if (!canManage) return
      resourceLogger.tableAction({
        resource: "tags",
        action: "hard-delete",
        resourceId: row.id,
        tagName: row.name,
      })
      setDeleteConfirm({
        open: true,
        type: "hard",
        row,
        onConfirm: async () => {
          await executeSingleAction("hard-delete", row, refreshTable)
        },
      })
    },
    [canManage, executeSingleAction, setDeleteConfirm, refreshTable],
  )

  const handleRestoreSingle = useCallback(
    (row: TagRow) => {
      if (!canRestore) return
      resourceLogger.tableAction({
        resource: "tags",
        action: "restore",
        resourceId: row.id,
        tagName: row.name,
      })
      setDeleteConfirm({
        open: true,
        type: "restore",
        row,
        onConfirm: async () => {
          await executeSingleAction("restore", row, refreshTable)
        },
      })
    },
    [canRestore, executeSingleAction, setDeleteConfirm, refreshTable],
  )

  const { renderActiveRowActions, renderDeletedRowActions } = useTagRowActions({
    canDelete,
    canRestore,
    canManage,
    onDelete: handleDeleteSingle,
    onHardDelete: handleHardDeleteSingle,
    onRestore: handleRestoreSingle,
    deletingTags,
    restoringTags,
    hardDeletingTags,
  })

  const fetchTags = useCallback(
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
    }): Promise<DataTableResult<TagRow>> => {
      const baseUrl = apiRoutes.tags.list({
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
        data?: TagsResponse
        error?: string
        message?: string
      }>(url)

      const payload = response.data.data
      if (!payload) {
        throw new Error(response.data.error || response.data.message || "Không thể tải danh sách thẻ tag")
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
    ({ query, view }: { query: DataTableQueryState; view: ResourceViewMode<TagRow> }): AdminTagsListParams => {
      const filtersRecord = sanitizeFilters(query.filters)

      return {
        status: (view.status ?? "active") as AdminTagsListParams["status"],
        page: query.page,
        limit: query.limit,
        search: normalizeSearch(query.search),
        filters: Object.keys(filtersRecord).length ? filtersRecord : undefined,
      }
    },
    [],
  )

  const fetchTagsWithDefaults = useCallback(
    (params: AdminTagsListParams) =>
      fetchTags({
        page: params.page,
        limit: params.limit,
        status: params.status ?? "active",
        search: params.search,
        filters: params.filters,
      }),
    [fetchTags],
  )

  const loader = useResourceTableLoader<TagRow, AdminTagsListParams>({
    queryClient,
    fetcher: fetchTagsWithDefaults,
    buildParams: buildListParams,
    buildQueryKey: queryKeys.adminTags.list,
  })

  const executeBulk = useCallback(
    (action: "delete" | "restore" | "hard-delete", ids: string[], refresh: () => void, clearSelection: () => void) => {
      if (ids.length === 0) return

      resourceLogger.tableAction({
        resource: "tags",
        action: action === "delete" ? "bulk-delete" : action === "restore" ? "bulk-restore" : "bulk-hard-delete",
        count: ids.length,
        tagIds: ids,
      })

      // Actions cần confirmation
      if (action === "delete" || action === "restore" || action === "hard-delete") {
        setDeleteConfirm({
          open: true,
          type: action === "hard-delete" ? "hard" : action === "restore" ? "restore" : "soft",
          bulkIds: ids,
          onConfirm: async () => {
            await executeBulkAction(action, ids, async () => refresh(), clearSelection)
          },
        })
      } else {
        executeBulkAction(action, ids, async () => refresh(), clearSelection)
      }
    },
    [executeBulkAction, setDeleteConfirm],
  )

  const buildInitialParams = useCallback(
    (data: DataTableResult<TagRow>): AdminTagsListParams => ({
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

  // Helper function for active view selection actions
  const createActiveSelectionActions = useCallback(
    ({ selectedIds, clearSelection, refresh }: {
      selectedIds: string[]
      clearSelection: () => void
      refresh: () => void
    }) => (
      <SelectionActionsWrapper
        label={TAG_LABELS.SELECTED_TAGS(selectedIds.length)}
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
                {TAG_LABELS.DELETE_SELECTED(selectedIds.length)}
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
                  {TAG_LABELS.HARD_DELETE_SELECTED(selectedIds.length)}
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
              {TAG_LABELS.CLEAR_SELECTION}
            </Button>
          </>
        }
      />
    ),
    [canManage, bulkState.isProcessing, executeBulk],
  )

  // Helper function for deleted view selection actions
  const createDeletedSelectionActions = useCallback(
    ({ selectedIds, clearSelection, refresh }: {
      selectedIds: string[]
      clearSelection: () => void
      refresh: () => void
    }) => (
      <SelectionActionsWrapper
        label={TAG_LABELS.SELECTED_DELETED_TAGS(selectedIds.length)}
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
                  {TAG_LABELS.RESTORE_SELECTED(selectedIds.length)}
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
                  {TAG_LABELS.HARD_DELETE_SELECTED(selectedIds.length)}
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
              {TAG_LABELS.CLEAR_SELECTION}
            </Button>
          </>
        }
      />
    ),
    [canRestore, canManage, bulkState.isProcessing, executeBulk],
  )

  const viewModes = useMemo<ResourceViewMode<TagRow>[]>(() => {
    const modes: ResourceViewMode<TagRow>[] = [
      {
        id: "active",
        label: TAG_LABELS.ACTIVE_VIEW,
        status: "active",
        selectionEnabled: canDelete,
        selectionActions: canDelete ? createActiveSelectionActions : undefined,
        rowActions: (row) => renderActiveRowActions(row),
        emptyMessage: TAG_LABELS.NO_TAGS,
      },
      {
        id: "deleted",
        label: TAG_LABELS.DELETED_VIEW,
        status: "deleted",
        columns: deletedColumns,
        selectionEnabled: canRestore || canManage,
        selectionActions: canRestore || canManage ? createDeletedSelectionActions : undefined,
        rowActions: (row) => renderDeletedRowActions(row),
        emptyMessage: TAG_LABELS.NO_DELETED_TAGS,
      },
    ]

    return modes
  }, [
    canDelete,
    canRestore,
    canManage,
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
      return TAG_CONFIRM_MESSAGES.HARD_DELETE_TITLE(
        deleteConfirm.bulkIds?.length,
      )
    }
    if (deleteConfirm.type === "restore") {
      return TAG_CONFIRM_MESSAGES.RESTORE_TITLE(
        deleteConfirm.bulkIds?.length,
      )
    }
    return TAG_CONFIRM_MESSAGES.DELETE_TITLE(deleteConfirm.bulkIds?.length)
  }

  const getDeleteConfirmDescription = () => {
    if (!deleteConfirm) return ""
    if (deleteConfirm.type === "hard") {
      return TAG_CONFIRM_MESSAGES.HARD_DELETE_DESCRIPTION(
        deleteConfirm.bulkIds?.length,
        deleteConfirm.row?.name,
      )
    }
    if (deleteConfirm.type === "restore") {
      return TAG_CONFIRM_MESSAGES.RESTORE_DESCRIPTION(
        deleteConfirm.bulkIds?.length,
        deleteConfirm.row?.name,
      )
    }
    return TAG_CONFIRM_MESSAGES.DELETE_DESCRIPTION(
      deleteConfirm.bulkIds?.length,
      deleteConfirm.row?.name,
    )
  }

  const router = useResourceRouter()

  const headerActions = canCreate ? (
    <Button
      type="button"
      size="sm"
      onClick={() => router.push("/admin/tags/new")}
      className="h-8 px-3 text-xs sm:text-sm"
    >
      <Plus className="mr-2 h-5 w-5" />
      {TAG_LABELS.ADD_NEW}
    </Button>
  ) : undefined

  return (
    <>
      <ResourceTableClient<TagRow>
        title={TAG_LABELS.MANAGE_TAGS}
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
              ? TAG_CONFIRM_MESSAGES.HARD_DELETE_LABEL 
              : deleteConfirm.type === "restore"
              ? TAG_CONFIRM_MESSAGES.RESTORE_LABEL
              : TAG_CONFIRM_MESSAGES.CONFIRM_LABEL
          }
          cancelLabel={TAG_CONFIRM_MESSAGES.CANCEL_LABEL}
          onConfirm={handleDeleteConfirm}
          isLoading={
            bulkState.isProcessing ||
            (deleteConfirm.row
              ? deleteConfirm.type === "restore"
                ? restoringTags.has(deleteConfirm.row.id)
                : deleteConfirm.type === "hard"
                ? hardDeletingTags.has(deleteConfirm.row.id)
                : deletingTags.has(deleteConfirm.row.id)
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
