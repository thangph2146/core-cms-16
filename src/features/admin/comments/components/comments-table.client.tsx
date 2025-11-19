"use client"

import { useCallback, useEffect, useMemo, useRef } from "react"
import { RotateCcw, Trash2, AlertTriangle, Check, X } from "lucide-react"

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
import { useCommentsSocketBridge } from "@/features/admin/comments/hooks/use-comments-socket-bridge"
import { useCommentActions } from "@/features/admin/comments/hooks/use-comment-actions"
import { useCommentFeedback } from "@/features/admin/comments/hooks/use-comment-feedback"
import { useCommentDeleteConfirm } from "@/features/admin/comments/hooks/use-comment-delete-confirm"
import { useCommentColumns } from "@/features/admin/comments/utils/columns"
import { useCommentRowActions } from "@/features/admin/comments/utils/row-actions"

import type { AdminCommentsListParams } from "@/lib/query-keys"
import type { CommentRow, CommentsResponse, CommentsTableClientProps } from "../types"
import { COMMENT_CONFIRM_MESSAGES, COMMENT_LABELS } from "../constants"
import { logger } from "@/lib/config"

export function CommentsTableClient({
  canDelete = false,
  canRestore = false,
  canManage = false,
  canApprove = false,
  initialData,
}: CommentsTableClientProps) {
  const queryClient = useQueryClient()
  const { isSocketConnected, cacheVersion } = useCommentsSocketBridge()
  const { feedback, showFeedback, handleFeedbackOpenChange } = useCommentFeedback()
  const { deleteConfirm, setDeleteConfirm, handleDeleteConfirm } = useCommentDeleteConfirm()

  const tableRefreshRef = useRef<(() => void) | null>(null)
  const tableSoftRefreshRef = useRef<(() => void) | null>(null)
  const pendingRealtimeRefreshRef = useRef(false)

  const {
    handleToggleApprove,
    executeSingleAction,
    executeBulkAction,
    approvingComments,
    unapprovingComments,
    togglingComments,
    deletingComments,
    restoringComments,
    hardDeletingComments,
    bulkState,
  } = useCommentActions({
    canApprove,
    canDelete,
    canRestore,
    canManage,
    isSocketConnected,
    showFeedback,
  })

  const handleToggleApproveWithRefresh = useCallback(
    (row: CommentRow, checked: boolean) => {
      if (!canApprove) return
      setDeleteConfirm({
        open: true,
        type: checked ? "approve" : "unapprove",
        row,
        onConfirm: async () => {
          if (tableRefreshRef.current) {
            await handleToggleApprove(row, checked, tableRefreshRef.current)
          }
        },
      })
    },
    [canApprove, handleToggleApprove, setDeleteConfirm],
  )

  const { baseColumns, deletedColumns } = useCommentColumns({
    togglingComments,
    canApprove,
    onToggleApprove: handleToggleApproveWithRefresh,
  })

  const handleDeleteSingle = useCallback(
    (row: CommentRow) => {
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
    (row: CommentRow) => {
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
    (row: CommentRow) => {
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

  const { renderActiveRowActions, renderDeletedRowActions } = useCommentRowActions({
    canApprove,
    canDelete,
    canRestore,
    canManage,
    onToggleApprove: handleToggleApproveWithRefresh,
    onDelete: handleDeleteSingle,
    onHardDelete: handleHardDeleteSingle,
    onRestore: handleRestoreSingle,
    approvingComments,
    unapprovingComments,
    deletingComments,
    restoringComments,
    hardDeletingComments,
  })

  const buildFiltersRecord = useCallback((filters: Record<string, string>): Record<string, string> => {
    return Object.entries(filters).reduce<Record<string, string>>((acc, [key, value]) => {
      if (value) {
        acc[key] = value
      }
      return acc
    }, {})
  }, [])

  const fetchComments = useCallback(
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
    }): Promise<DataTableResult<CommentRow>> => {
      const baseUrl = apiRoutes.comments.list({
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
        data?: CommentsResponse
        error?: string
        message?: string
      }>(url)

      const payload = response.data.data
      if (!payload) {
        throw new Error(response.data.error || response.data.message || "Không thể tải danh sách bình luận")
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

  const loader = useCallback(
    async (query: DataTableQueryState, view: ResourceViewMode<CommentRow>) => {
      const status = (view.status ?? "active") as AdminCommentsListParams["status"]
      const search = query.search.trim() || undefined
      const filters = buildFiltersRecord(query.filters)

      const params: AdminCommentsListParams = {
        status,
        page: query.page,
        limit: query.limit,
        search,
        filters,
      }

      const queryKey = queryKeys.adminComments.list(params)

      return await queryClient.fetchQuery({
        queryKey,
        staleTime: Infinity,
        queryFn: () =>
          fetchComments({
            page: query.page,
            limit: query.limit,
            status,
            search,
            filters,
          }),
      })
    },
    [buildFiltersRecord, fetchComments, queryClient],
  )

  const executeBulk = useCallback(
    (action: "delete" | "restore" | "hard-delete" | "approve" | "unapprove", ids: string[], refresh: () => void, clearSelection: () => void) => {
      if (ids.length === 0) return

      // Tất cả actions đều cần confirmation
      setDeleteConfirm({
        open: true,
        type: action === "hard-delete" ? "hard" : action === "restore" ? "restore" : action === "approve" ? "approve" : action === "unapprove" ? "unapprove" : "soft",
        bulkIds: ids,
        onConfirm: async () => {
          await executeBulkAction(action, ids, refresh, clearSelection)
        },
      })
    },
    [executeBulkAction, setDeleteConfirm],
  )

  const createActiveSelectionActions = useCallback(
    ({
      selectedIds,
      selectedRows,
      clearSelection,
      refresh,
    }: {
      selectedIds: string[]
      selectedRows: CommentRow[]
      clearSelection: () => void
      refresh: () => void
    }) => {
      const approvedCount = selectedRows.filter((row) => row.approved).length
      const unapprovedCount = selectedRows.length - approvedCount

      return (
        <SelectionActionsWrapper
          label={COMMENT_LABELS.SELECTED_COMMENTS(selectedIds.length)}
          actions={
            <>
              {canApprove && unapprovedCount > 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={bulkState.isProcessing || selectedIds.length === 0}
                  onClick={() => executeBulk("approve", selectedIds, refresh, clearSelection)}
                  className="whitespace-nowrap"
                >
                  <Check className="mr-2 h-5 w-5 shrink-0" />
                  <span className="hidden sm:inline">
                    {COMMENT_LABELS.APPROVE_SELECTED(unapprovedCount)}
                  </span>
                  <span className="sm:hidden">Duyệt</span>
                </Button>
              )}
              {canApprove && approvedCount > 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={bulkState.isProcessing || selectedIds.length === 0}
                  onClick={() => executeBulk("unapprove", selectedIds, refresh, clearSelection)}
                  className="whitespace-nowrap"
                >
                  <X className="mr-2 h-5 w-5 shrink-0" />
                  <span className="hidden sm:inline">
                    {COMMENT_LABELS.UNAPPROVE_SELECTED(approvedCount)}
                  </span>
                  <span className="sm:hidden">Hủy</span>
                </Button>
              )}
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
                    {COMMENT_LABELS.DELETE_SELECTED(selectedIds.length)}
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
                    {COMMENT_LABELS.HARD_DELETE_SELECTED(selectedIds.length)}
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
                {COMMENT_LABELS.CLEAR_SELECTION}
              </Button>
            </>
          }
        />
      )
    },
    [canApprove, canDelete, canManage, bulkState.isProcessing, executeBulk],
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
        label={COMMENT_LABELS.SELECTED_DELETED_COMMENTS(selectedIds.length)}
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
                  {COMMENT_LABELS.RESTORE_SELECTED(selectedIds.length)}
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
                  {COMMENT_LABELS.HARD_DELETE_SELECTED(selectedIds.length)}
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
              {COMMENT_LABELS.CLEAR_SELECTION}
            </Button>
          </>
        }
      />
    ),
    [canRestore, canManage, bulkState.isProcessing, executeBulk],
  )

  const viewModes = useMemo<ResourceViewMode<CommentRow>[]>(() => {
    const modes: ResourceViewMode<CommentRow>[] = [
      {
        id: "active",
        label: COMMENT_LABELS.ACTIVE_VIEW,
        status: "active",
        columns: baseColumns,
        selectionEnabled: canDelete || canApprove,
        selectionActions: canDelete || canApprove ? createActiveSelectionActions : undefined,
        rowActions: (row) => renderActiveRowActions(row),
        emptyMessage: COMMENT_LABELS.NO_COMMENTS,
      },
      {
        id: "deleted",
        label: COMMENT_LABELS.DELETED_VIEW,
        status: "deleted",
        columns: deletedColumns,
        selectionEnabled: canRestore || canManage,
        selectionActions: canRestore || canManage ? createDeletedSelectionActions : undefined,
        rowActions: (row) => renderDeletedRowActions(row),
        emptyMessage: COMMENT_LABELS.NO_DELETED_COMMENTS,
      },
    ]

    return modes
  }, [
    canDelete,
    canRestore,
    canManage,
    canApprove,
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
      return COMMENT_CONFIRM_MESSAGES.HARD_DELETE_TITLE(
        deleteConfirm.bulkIds?.length,
      )
    }
    if (deleteConfirm.type === "restore") {
      return COMMENT_CONFIRM_MESSAGES.RESTORE_TITLE(
        deleteConfirm.bulkIds?.length,
      )
    }
    if (deleteConfirm.type === "approve") {
      return COMMENT_CONFIRM_MESSAGES.APPROVE_TITLE(
        deleteConfirm.bulkIds?.length,
      )
    }
    if (deleteConfirm.type === "unapprove") {
      return COMMENT_CONFIRM_MESSAGES.UNAPPROVE_TITLE(
        deleteConfirm.bulkIds?.length,
      )
    }
    return COMMENT_CONFIRM_MESSAGES.DELETE_TITLE(deleteConfirm.bulkIds?.length)
  }

  const getDeleteConfirmDescription = () => {
    if (!deleteConfirm) return ""
    if (deleteConfirm.type === "hard") {
      return COMMENT_CONFIRM_MESSAGES.HARD_DELETE_DESCRIPTION(
        deleteConfirm.bulkIds?.length,
      )
    }
    if (deleteConfirm.type === "restore") {
      return COMMENT_CONFIRM_MESSAGES.RESTORE_DESCRIPTION(
        deleteConfirm.bulkIds?.length,
      )
    }
    if (deleteConfirm.type === "approve") {
      return COMMENT_CONFIRM_MESSAGES.APPROVE_DESCRIPTION(
        deleteConfirm.bulkIds?.length,
      )
    }
    if (deleteConfirm.type === "unapprove") {
      return COMMENT_CONFIRM_MESSAGES.UNAPPROVE_DESCRIPTION(
        deleteConfirm.bulkIds?.length,
      )
    }
    return COMMENT_CONFIRM_MESSAGES.DELETE_DESCRIPTION(
      deleteConfirm.bulkIds?.length,
    )
  }

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
    
    const params: AdminCommentsListParams = {
      status: "active",
      page: initialData.page,
      limit: initialData.limit,
      search: undefined,
      filters: undefined,
    }
    
    const queryKey = queryKeys.adminComments.list(params)
    queryClient.setQueryData(queryKey, initialData)
    
    logger.debug("Set initial data to cache", {
      queryKey: queryKey.slice(0, 2),
      rowsCount: initialData.rows.length,
      total: initialData.total,
    })
  }, [initialData, queryClient])

  return (
    <>
      <ResourceTableClient<CommentRow>
        title={COMMENT_LABELS.MANAGE_COMMENTS}
        baseColumns={baseColumns}
        loader={loader}
        viewModes={viewModes}
        defaultViewId="active"
        initialDataByView={initialDataByView}
        fallbackRowCount={6}
        onRefreshReady={(refresh) => {
          const wrapped = () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.adminComments.all(), refetchType: "none" })
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
          variant={
            deleteConfirm.type === "hard"
              ? "destructive"
              : deleteConfirm.type === "restore" || deleteConfirm.type === "approve" || deleteConfirm.type === "unapprove"
              ? "default"
              : "destructive"
          }
          confirmLabel={
            deleteConfirm.type === "hard"
              ? COMMENT_CONFIRM_MESSAGES.HARD_DELETE_LABEL
              : deleteConfirm.type === "restore"
              ? COMMENT_CONFIRM_MESSAGES.RESTORE_LABEL
              : deleteConfirm.type === "approve"
              ? COMMENT_CONFIRM_MESSAGES.APPROVE_LABEL
              : deleteConfirm.type === "unapprove"
              ? COMMENT_CONFIRM_MESSAGES.UNAPPROVE_LABEL
              : COMMENT_CONFIRM_MESSAGES.CONFIRM_LABEL
          }
          cancelLabel={COMMENT_CONFIRM_MESSAGES.CANCEL_LABEL}
          onConfirm={handleDeleteConfirm}
          isLoading={
            bulkState.isProcessing ||
            (deleteConfirm.row
              ? deleteConfirm.type === "restore"
                ? restoringComments.has(deleteConfirm.row.id)
                : deleteConfirm.type === "hard"
                ? hardDeletingComments.has(deleteConfirm.row.id)
                : deleteConfirm.type === "approve"
                ? approvingComments.has(deleteConfirm.row.id)
                : deleteConfirm.type === "unapprove"
                ? unapprovingComments.has(deleteConfirm.row.id)
                : deletingComments.has(deleteConfirm.row.id)
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
