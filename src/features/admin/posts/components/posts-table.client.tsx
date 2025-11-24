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
import type { ResourceViewMode, ResourceRefreshHandler } from "@/features/admin/resources/types"
import {
  useResourceTableLoader,
  useResourceTableRefresh,
  useResourceTableLogger,
} from "@/features/admin/resources/hooks"
import { normalizeSearch, sanitizeFilters } from "@/features/admin/resources/utils"
import { apiClient } from "@/lib/api/axios"
import { apiRoutes } from "@/lib/api/routes"
import { useQueryClient } from "@tanstack/react-query"
import { queryKeys, type AdminPostsListParams } from "@/lib/query-keys"
import { usePostsSocketBridge } from "../hooks/use-posts-socket-bridge"
import { usePostActions } from "../hooks/use-post-actions"
import { usePostFeedback } from "../hooks/use-post-feedback"
import { usePostDeleteConfirm } from "../hooks/use-post-delete-confirm"
import { usePostColumns } from "../utils/columns"
import { usePostRowActions } from "../utils/row-actions"

import type { PostRow, PostsResponse, PostsTableClientProps } from "../types"
import { POST_CONFIRM_MESSAGES, POST_LABELS } from "../constants/messages"
import { resourceLogger } from "@/lib/config"
import { sanitizeSearchQuery } from "@/lib/api/validation"

export function PostsTableClient({
  canDelete = false,
  canRestore = false,
  canManage = false,
  canCreate = false,
  initialData,
}: PostsTableClientProps) {
  const router = useResourceRouter()
  const queryClient = useQueryClient()
  const { cacheVersion } = usePostsSocketBridge()
  const { feedback, showFeedback, handleFeedbackOpenChange } = usePostFeedback()
  const { deleteConfirm, setDeleteConfirm, handleDeleteConfirm } = usePostDeleteConfirm()
  const [togglingPosts, setTogglingPosts] = useState<Set<string>>(new Set())
  const canToggleStatus = canManage

  const getInvalidateQueryKey = useCallback(() => queryKeys.adminPosts.all(), [])
  const { onRefreshReady, refresh: refreshTable } = useResourceTableRefresh({
    queryClient,
    getInvalidateQueryKey,
    cacheVersion,
  })

  const {
    executeSingleAction,
    executeBulkAction,
    deletingIds,
    restoringIds,
    hardDeletingIds,
    bulkState,
  } = usePostActions({
    canDelete,
    canRestore,
    canManage,
    showFeedback,
  })

  const handleTogglePublished = useCallback(
    async (row: PostRow, newStatus: boolean, _refresh: ResourceRefreshHandler) => {
      if (!canToggleStatus) {
        showFeedback("error", "Không có quyền", "Bạn không có quyền thay đổi trạng thái xuất bản")
        return
      }

      resourceLogger.actionFlow({
        resource: "posts",
        action: newStatus ? "publish" : "unpublish",
        step: "start",
        metadata: { postId: row.id, postTitle: row.title, newStatus },
      })

      setTogglingPosts((prev) => {
        const next = new Set(prev)
        next.add(row.id)
        return next
      })

      try {
        await apiClient.put(apiRoutes.posts.update(row.id), {
          published: newStatus,
        })

        showFeedback(
          "success",
          "Cập nhật thành công",
          `Bài viết "${row.title}" đã được ${newStatus ? "xuất bản" : "chuyển sang bản nháp"}.`,
        )
        
        resourceLogger.actionFlow({
          resource: "posts",
          action: newStatus ? "publish" : "unpublish",
          step: "success",
          metadata: { postId: row.id, postTitle: row.title, newStatus },
        })

        // Socket events đã update cache và trigger refresh qua cacheVersion
        // Không cần manual refresh nữa để tránh duplicate refresh
      } catch (error: unknown) {
        // Extract error message từ response nếu có
        let errorMessage: string = "Đã xảy ra lỗi không xác định"
        if (error && typeof error === "object" && "response" in error) {
          const axiosError = error as { response?: { data?: { error?: string; message?: string } } }
          errorMessage = axiosError.response?.data?.error || axiosError.response?.data?.message || errorMessage
        } else if (error instanceof Error) {
          errorMessage = error.message
        }

        showFeedback(
          "error",
          "Cập nhật thất bại",
          `Không thể ${newStatus ? "xuất bản" : "chuyển sang bản nháp"} bài viết "${row.title}". Vui lòng thử lại.`,
          errorMessage
        )

        resourceLogger.actionFlow({
          resource: "posts",
          action: newStatus ? "publish" : "unpublish",
          step: "error",
          metadata: { postId: row.id, postTitle: row.title, newStatus, error: errorMessage },
        })
      } finally {
        setTogglingPosts((prev) => {
          const next = new Set(prev)
          next.delete(row.id)
          return next
        })
      }
    },
    [canToggleStatus, showFeedback],
  )

  const { baseColumns, deletedColumns } = usePostColumns({
    togglingPosts,
    canToggleStatus,
    onTogglePublished: handleTogglePublished,
    refreshTable,
  })

  const handleDeleteSingle = useCallback(
    (row: PostRow) => {
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
    (row: PostRow) => {
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
    (row: PostRow) => {
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

  const { renderActiveRowActions, renderDeletedRowActions } = usePostRowActions({
    canDelete,
    canRestore,
    canManage,
    onDelete: handleDeleteSingle,
    onHardDelete: handleHardDeleteSingle,
    onRestore: handleRestoreSingle,
    deletingIds,
    restoringIds,
    hardDeletingIds,
  })

  const fetchPosts = useCallback(
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
    }): Promise<DataTableResult<PostRow>> => {
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

      const response = await apiClient.get<PostsResponse>(apiRoutes.posts.list(), {
        params: requestParams,
      })
      const payload = response.data

      if (!payload || !payload.data) {
        throw new Error("Không thể tải danh sách bài viết")
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
    ({ query, view }: { query: DataTableQueryState; view: ResourceViewMode<PostRow> }): AdminPostsListParams => {
      const filtersRecord = sanitizeFilters(query.filters)
      const normalizedSearch = normalizeSearch(query.search)

      return {
        status: (view.status ?? "active") as AdminPostsListParams["status"],
        page: query.page,
        limit: query.limit,
        search: normalizedSearch,
        filters: Object.keys(filtersRecord).length ? filtersRecord : undefined,
      }
    },
    [],
  )

  const fetchPostsWithDefaults = useCallback(
    (params: AdminPostsListParams) =>
      fetchPosts({
        page: params.page,
        limit: params.limit,
        status: params.status ?? "active",
        search: params.search,
        filters: params.filters,
      }),
    [fetchPosts],
  )

  const loader = useResourceTableLoader<PostRow, AdminPostsListParams>({
    queryClient,
    fetcher: fetchPostsWithDefaults,
    buildParams: buildListParams,
    buildQueryKey: queryKeys.adminPosts.list,
  })

  const executeBulk = useCallback(
    (action: "delete" | "restore" | "hard-delete", ids: string[], refresh: () => void, clearSelection: () => void) => {
      if (ids.length === 0) return

      resourceLogger.tableAction({
        resource: "posts",
        action: action === "delete" ? "bulk-delete" : action === "restore" ? "bulk-restore" : "bulk-hard-delete",
        count: ids.length,
        postIds: ids,
      })

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
    (data: DataTableResult<PostRow>): AdminPostsListParams => ({
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

  // Track current view để log khi view thay đổi
  const [currentViewId, setCurrentViewId] = useState<string>("active")

  // Log table structure khi data thay đổi sau refetch hoặc khi view thay đổi
  useResourceTableLogger<PostRow>({
    resourceName: "posts",
    initialData,
    initialDataByView: initialData ? { active: initialData } : undefined,
    currentViewId,
    queryClient,
    buildQueryKey: (params) => queryKeys.adminPosts.list({
      ...params,
      search: undefined,
      filters: undefined,
    }),
    columns: ["id", "title", "slug", "published", "createdAt", "deletedAt"],
    getRowData: (row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      published: row.published,
      createdAt: row.createdAt,
      deletedAt: row.deletedAt,
    }),
    cacheVersion,
  })

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
        label={POST_LABELS.SELECTED_POSTS(selectedIds.length)}
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
                  {POST_LABELS.DELETE_SELECTED(selectedIds.length)}
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
                  {POST_LABELS.HARD_DELETE_SELECTED(selectedIds.length)}
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
              {POST_LABELS.CLEAR_SELECTION}
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
        label={POST_LABELS.SELECTED_DELETED_POSTS(selectedIds.length)}
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
                  {POST_LABELS.RESTORE_SELECTED(selectedIds.length)}
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
                  {POST_LABELS.HARD_DELETE_SELECTED(selectedIds.length)}
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
              {POST_LABELS.CLEAR_SELECTION}
            </Button>
          </>
        }
      />
    ),
    [canRestore, canManage, bulkState.isProcessing, executeBulk],
  )

  const viewModes = useMemo<ResourceViewMode<PostRow>[]>(() => {
    const modes: ResourceViewMode<PostRow>[] = [
      {
        id: "active",
        label: POST_LABELS.ACTIVE_VIEW,
        status: "active",
        columns: baseColumns,
        selectionEnabled: canDelete || canManage,
        selectionActions: canDelete || canManage ? createActiveSelectionActions : undefined,
        rowActions: (row) => renderActiveRowActions(row),
        emptyMessage: POST_LABELS.NO_POSTS,
      },
      {
        id: "deleted",
        label: POST_LABELS.DELETED_VIEW,
        status: "deleted",
        columns: deletedColumns,
        selectionEnabled: canRestore || canManage,
        selectionActions: canRestore || canManage ? createDeletedSelectionActions : undefined,
        rowActions: (row) => renderDeletedRowActions(row),
        emptyMessage: POST_LABELS.NO_DELETED_POSTS,
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
      return POST_CONFIRM_MESSAGES.HARD_DELETE_TITLE(
        deleteConfirm.bulkIds?.length,
      )
    }
    if (deleteConfirm.type === "restore") {
      return POST_CONFIRM_MESSAGES.RESTORE_TITLE(
        deleteConfirm.bulkIds?.length,
      )
    }
    return POST_CONFIRM_MESSAGES.DELETE_TITLE(deleteConfirm.bulkIds?.length)
  }

  const getDeleteConfirmDescription = () => {
    if (!deleteConfirm) return ""
    if (deleteConfirm.type === "hard") {
      return POST_CONFIRM_MESSAGES.HARD_DELETE_DESCRIPTION(
        deleteConfirm.bulkIds?.length,
        deleteConfirm.row?.title,
      )
    }
    if (deleteConfirm.type === "restore") {
      return POST_CONFIRM_MESSAGES.RESTORE_DESCRIPTION(
        deleteConfirm.bulkIds?.length,
        deleteConfirm.row?.title,
      )
    }
    return POST_CONFIRM_MESSAGES.DELETE_DESCRIPTION(
      deleteConfirm.bulkIds?.length,
      deleteConfirm.row?.title,
    )
  }

  const headerActions = canCreate ? (
    <Button
      type="button"
      size="sm"
      onClick={() => router.push("/admin/posts/new")}
      className="h-8 px-3 text-xs sm:text-sm"
    >
      <Plus className="mr-2 h-5 w-5" />
      {POST_LABELS.ADD_NEW}
    </Button>
  ) : undefined

  return (
    <>
      <ResourceTableClient<PostRow>
        title={POST_LABELS.MANAGE_POSTS}
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
              ? POST_CONFIRM_MESSAGES.HARD_DELETE_LABEL 
              : deleteConfirm.type === "restore"
              ? POST_CONFIRM_MESSAGES.RESTORE_LABEL
              : POST_CONFIRM_MESSAGES.CONFIRM_LABEL
          }
          cancelLabel={POST_CONFIRM_MESSAGES.CANCEL_LABEL}
          onConfirm={handleDeleteConfirm}
          isLoading={
            bulkState.isProcessing ||
            (deleteConfirm.row
              ? deleteConfirm.type === "restore"
                ? restoringIds.has(deleteConfirm.row.id)
                : deleteConfirm.type === "hard"
                ? hardDeletingIds.has(deleteConfirm.row.id)
                : deletingIds.has(deleteConfirm.row.id)
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
