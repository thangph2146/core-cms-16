"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import { useResourceRouter } from "@/hooks/use-resource-segment"
import { RotateCcw, Trash2, MoreHorizontal, AlertTriangle, Eye } from "lucide-react"

import { ConfirmDialog } from "@/components/dialogs"
import type { DataTableColumn, DataTableQueryState, DataTableResult } from "@/components/tables"
import { FeedbackDialog, type FeedbackVariant } from "@/components/dialogs"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import { ResourceTableClient } from "@/features/admin/resources/components/resource-table.client"
import type { ResourceViewMode } from "@/features/admin/resources/types"
import { useDynamicFilterOptions } from "@/features/admin/resources/hooks/use-dynamic-filter-options"
import { apiClient } from "@/lib/api/axios"
import { apiRoutes } from "@/lib/api/routes"

import type { CommentRow, CommentsResponse, CommentsTableClientProps } from "../types"

interface FeedbackState {
  open: boolean
  variant: FeedbackVariant
  title: string
  description?: string
  details?: string
}

interface DeleteConfirmState {
  open: boolean
  type: "soft" | "hard"
  row?: CommentRow
  bulkIds?: string[]
  onConfirm: () => Promise<void>
}

export function CommentsTableClient({
  canDelete = false,
  canRestore = false,
  canManage = false,
  canApprove = false,
  initialData,
}: CommentsTableClientProps) {
  const router = useResourceRouter()
  const [isBulkProcessing, setIsBulkProcessing] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackState | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState | null>(null)
  const [togglingComments, setTogglingComments] = useState<Set<string>>(new Set())
  const tableRefreshRef = useRef<(() => void) | null>(null)

  const showFeedback = useCallback(
    (variant: FeedbackVariant, title: string, description?: string, details?: string) => {
      setFeedback({ open: true, variant, title, description, details })
    },
    [],
  )

  const handleFeedbackOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setFeedback(null)
    }
  }, [])

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [],
  )

  const contentFilter = useDynamicFilterOptions({
    optionsEndpoint: apiRoutes.comments.options({ column: "content" }),
  })

  const authorNameFilter = useDynamicFilterOptions({
    optionsEndpoint: apiRoutes.comments.options({ column: "authorName" }),
  })

  const authorEmailFilter = useDynamicFilterOptions({
    optionsEndpoint: apiRoutes.comments.options({ column: "authorEmail" }),
  })

  const postTitleFilter = useDynamicFilterOptions({
    optionsEndpoint: apiRoutes.comments.options({ column: "postTitle" }),
  })

  // Handler để toggle approve status
  const handleToggleApprove = useCallback(
    async (row: CommentRow, newStatus: boolean, refresh: () => void) => {
      if (!canApprove) {
        showFeedback("error", "Không có quyền", "Bạn không có quyền duyệt/hủy duyệt bình luận")
        return
      }

      setTogglingComments((prev) => new Set(prev).add(row.id))

      try {
        if (newStatus) {
          await apiClient.post(apiRoutes.comments.approve(row.id))
          showFeedback("success", "Duyệt thành công", `Đã duyệt bình luận từ ${row.authorName || row.authorEmail}`)
        } else {
          await apiClient.post(apiRoutes.comments.unapprove(row.id))
          showFeedback("success", "Hủy duyệt thành công", `Đã hủy duyệt bình luận từ ${row.authorName || row.authorEmail}`)
        }
        refresh()
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định"
        showFeedback("error", newStatus ? "Duyệt thất bại" : "Hủy duyệt thất bại", `Không thể ${newStatus ? "duyệt" : "hủy duyệt"} bình luận`, errorMessage)
      } finally {
        setTogglingComments((prev) => {
          const next = new Set(prev)
          next.delete(row.id)
          return next
        })
      }
    },
    [canApprove, showFeedback],
  )

  const baseColumns = useMemo<DataTableColumn<CommentRow>[]>(
    () => [
      {
        accessorKey: "content",
        header: "Nội dung",
        filter: {
          type: "select",
          placeholder: "Chọn nội dung...",
          searchPlaceholder: "Tìm kiếm...",
          emptyMessage: "Không tìm thấy.",
          options: contentFilter.options,
          onSearchChange: contentFilter.onSearchChange,
          isLoading: contentFilter.isLoading,
        },
        className: "min-w-[200px] max-w-[400px]",
        headerClassName: "min-w-[200px] max-w-[400px]",
        cell: (row) => (
          <div className="max-w-[400px] truncate" title={row.content}>
            {row.content}
          </div>
        ),
      },
      {
        accessorKey: "approved",
        header: "Trạng thái",
        filter: {
          type: "select",
          placeholder: "Chọn trạng thái...",
          searchPlaceholder: "Tìm kiếm...",
          emptyMessage: "Không tìm thấy.",
          options: [
            { label: "Đã duyệt", value: "true" },
            { label: "Chờ duyệt", value: "false" },
          ],
        },
        className: "min-w-[140px] max-w-[180px]",
        headerClassName: "min-w-[140px] max-w-[180px]",
        cell: (row) => (
          row.deletedAt ? (
            <span className="inline-flex min-w-[88px] items-center justify-center rounded-full bg-rose-100 px-2 py-1 text-xs font-medium text-rose-700">
              Đã xóa
            </span>
          ) : (
            <div className="flex items-center gap-2">
              <Switch
                checked={row.approved}
                disabled={togglingComments.has(row.id) || !canApprove}
                onCheckedChange={(checked) => {
                  if (tableRefreshRef.current) {
                    handleToggleApprove(row, checked, tableRefreshRef.current)
                  }
                }}
                aria-label={row.approved ? "Hủy duyệt bình luận" : "Duyệt bình luận"}
              />
              <span className="text-xs text-muted-foreground">
                {row.approved ? "Đã duyệt" : "Chờ duyệt"}
              </span>
            </div>
          )
        ),
      },
      {
        accessorKey: "authorName",
        header: "Người bình luận",
        filter: {
          type: "select",
          placeholder: "Chọn người bình luận...",
          searchPlaceholder: "Tìm kiếm...",
          emptyMessage: "Không tìm thấy.",
          options: authorNameFilter.options,
          onSearchChange: authorNameFilter.onSearchChange,
          isLoading: authorNameFilter.isLoading,
        },
        className: "min-w-[150px] max-w-[200px]",
        headerClassName: "min-w-[150px] max-w-[200px]",
        cell: (row) => row.authorName || row.authorEmail,
      },
      {
        accessorKey: "authorEmail",
        header: "Email",
        filter: {
          type: "select",
          placeholder: "Chọn email...",
          searchPlaceholder: "Tìm kiếm...",
          emptyMessage: "Không tìm thấy.",
          options: authorEmailFilter.options,
          onSearchChange: authorEmailFilter.onSearchChange,
          isLoading: authorEmailFilter.isLoading,
        },
        className: "min-w-[180px] max-w-[250px]",
        headerClassName: "min-w-[180px] max-w-[250px]",
      },
      {
        accessorKey: "postTitle",
        header: "Bài viết",
        filter: {
          type: "select",
          placeholder: "Chọn bài viết...",
          searchPlaceholder: "Tìm kiếm...",
          emptyMessage: "Không tìm thấy.",
          options: postTitleFilter.options,
          onSearchChange: postTitleFilter.onSearchChange,
          isLoading: postTitleFilter.isLoading,
        },
        className: "min-w-[150px] max-w-[250px]",
        headerClassName: "min-w-[150px] max-w-[250px]",
        cell: (row) => (
          <div className="max-w-[250px] truncate" title={row.postTitle}>
            {row.postTitle}
          </div>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Ngày tạo",
        filter: {
          type: "date",
          placeholder: "Chọn ngày tạo",
          dateFormat: "dd/MM/yyyy",
        },
        className: "min-w-[140px] max-w-[180px]",
        headerClassName: "min-w-[140px] max-w-[180px]",
        cell: (row) => {
          try {
            return dateFormatter.format(new Date(row.createdAt))
          } catch {
            return row.createdAt
          }
        },
      },
    ],
    [
      dateFormatter,
      contentFilter.options,
      contentFilter.onSearchChange,
      contentFilter.isLoading,
      authorNameFilter.options,
      authorNameFilter.onSearchChange,
      authorNameFilter.isLoading,
      authorEmailFilter.options,
      authorEmailFilter.onSearchChange,
      authorEmailFilter.isLoading,
      postTitleFilter.options,
      postTitleFilter.onSearchChange,
      postTitleFilter.isLoading,
      togglingComments,
      canApprove,
      handleToggleApprove,
    ],
  )

  const deletedColumns = useMemo<DataTableColumn<CommentRow>[]>(
    () => [
      ...baseColumns,
      {
        accessorKey: "deletedAt",
        header: "Ngày xóa",
        filter: {
          type: "date",
          placeholder: "Chọn ngày xóa",
          dateFormat: "dd/MM/yyyy",
        },
        className: "min-w-[140px] max-w-[180px]",
        headerClassName: "min-w-[140px] max-w-[180px]",
        cell: (row) => {
          if (!row.deletedAt) return "-"
          try {
            return dateFormatter.format(new Date(row.deletedAt))
          } catch {
            return row.deletedAt
          }
        },
      },
    ],
    [baseColumns, dateFormatter],
  )

  const loader = useCallback(
    async (query: DataTableQueryState, view: ResourceViewMode<CommentRow>) => {
      const baseUrl = apiRoutes.comments.list({
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

      const response = await apiClient.get<CommentsResponse>(url)
      const payload = response.data

      return {
        rows: payload.data,
        page: payload.pagination.page,
        limit: payload.pagination.limit,
        total: payload.pagination.total,
        totalPages: payload.pagination.totalPages,
      } satisfies DataTableResult<CommentRow>
    },
    [],
  )

  const handleDeleteSingle = useCallback(
    (row: CommentRow, refresh: () => void) => {
      if (!canDelete) return
      setDeleteConfirm({
        open: true,
        type: "soft",
        row,
        onConfirm: async () => {
          try {
            await apiClient.delete(apiRoutes.comments.delete(row.id))
            showFeedback("success", "Xóa thành công", `Đã xóa bình luận từ ${row.authorName || row.authorEmail}`)
            refresh()
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định"
            showFeedback("error", "Xóa thất bại", `Không thể xóa bình luận`, errorMessage)
            throw error
          }
        },
      })
    },
    [canDelete, showFeedback],
  )

  const handleHardDeleteSingle = useCallback(
    (row: CommentRow, refresh: () => void) => {
      if (!canManage) return
      setDeleteConfirm({
        open: true,
        type: "hard",
        row,
        onConfirm: async () => {
          try {
            await apiClient.delete(apiRoutes.comments.hardDelete(row.id))
            showFeedback("success", "Xóa vĩnh viễn thành công", `Đã xóa vĩnh viễn bình luận từ ${row.authorName || row.authorEmail}`)
            refresh()
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định"
            showFeedback("error", "Xóa vĩnh viễn thất bại", `Không thể xóa vĩnh viễn bình luận`, errorMessage)
            throw error
          }
        },
      })
    },
    [canManage, showFeedback],
  )

  const handleRestoreSingle = useCallback(
    async (row: CommentRow, refresh: () => void) => {
      if (!canRestore) return

      try {
        await apiClient.post(apiRoutes.comments.restore(row.id))
        showFeedback("success", "Khôi phục thành công", `Đã khôi phục bình luận từ ${row.authorName || row.authorEmail}`)
        refresh()
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định"
        showFeedback("error", "Khôi phục thất bại", `Không thể khôi phục bình luận`, errorMessage)
      }
    },
    [canRestore, showFeedback],
  )

  const executeBulk = useCallback(
    (action: "approve" | "unapprove" | "delete" | "restore" | "hard-delete", ids: string[], refresh: () => void, clearSelection: () => void) => {
      if (ids.length === 0) return

      if (action === "delete") {
        setDeleteConfirm({
          open: true,
          type: "soft",
          bulkIds: ids,
          onConfirm: async () => {
            setIsBulkProcessing(true)
            try {
              await apiClient.post(apiRoutes.comments.bulk, { action, ids })
              showFeedback("success", "Xóa thành công", `Đã xóa ${ids.length} bình luận`)
              clearSelection()
              refresh()
            } catch (error: unknown) {
              const errorMessage = error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định"
              showFeedback("error", "Xóa hàng loạt thất bại", `Không thể xóa ${ids.length} bình luận`, errorMessage)
              throw error
            } finally {
              setIsBulkProcessing(false)
            }
          },
        })
      } else if (action === "hard-delete") {
        setDeleteConfirm({
          open: true,
          type: "hard",
          bulkIds: ids,
          onConfirm: async () => {
            setIsBulkProcessing(true)
            try {
              await apiClient.post(apiRoutes.comments.bulk, { action, ids })
              showFeedback("success", "Xóa vĩnh viễn thành công", `Đã xóa vĩnh viễn ${ids.length} bình luận`)
              clearSelection()
              refresh()
            } catch (error: unknown) {
              const errorMessage = error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định"
              showFeedback("error", "Xóa vĩnh viễn thất bại", `Không thể xóa vĩnh viễn ${ids.length} bình luận`, errorMessage)
              throw error
            } finally {
              setIsBulkProcessing(false)
            }
          },
        })
      } else {
        setIsBulkProcessing(true)
        ;(async () => {
          try {
            await apiClient.post(apiRoutes.comments.bulk, { action, ids })
            if (action === "approve") {
              showFeedback("success", "Duyệt thành công", `Đã duyệt ${ids.length} bình luận`)
            } else if (action === "unapprove") {
              showFeedback("success", "Hủy duyệt thành công", `Đã hủy duyệt ${ids.length} bình luận`)
            } else {
              showFeedback("success", "Khôi phục thành công", `Đã khôi phục ${ids.length} bình luận`)
            }
            clearSelection()
            refresh()
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định"
            showFeedback("error", "Thao tác thất bại", `Không thể thực hiện thao tác cho ${ids.length} bình luận`, errorMessage)
          } finally {
            setIsBulkProcessing(false)
          }
        })()
      }
    },
    [showFeedback],
  )

  const viewModes = useMemo<ResourceViewMode<CommentRow>[]>(() => {
    const modes: ResourceViewMode<CommentRow>[] = [
      {
        id: "active",
        label: "Đang hoạt động",
        status: "active",
        selectionEnabled: canDelete || canApprove,
        selectionActions: canDelete || canApprove
          ? ({ selectedIds, clearSelection, refresh }) => (
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <span>
                  Đã chọn <strong>{selectedIds.length}</strong> bình luận
                </span>
                <div className="flex items-center gap-2">
                  {canDelete && (
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={isBulkProcessing}
                      onClick={() => executeBulk("delete", selectedIds, refresh, clearSelection)}
                    >
                      <Trash2 className="mr-2 h-5 w-5" />
                      Xóa đã chọn
                    </Button>
                  )}
                  <Button type="button" size="sm" variant="outline" onClick={clearSelection}>
                    Bỏ chọn
                  </Button>
                </div>
              </div>
            )
          : undefined,
        rowActions:
          canDelete || canApprove
            ? (row, { refresh }) => (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => router.push(`/admin/comments/${row.id}`)}>
                      <Eye className="mr-2 h-5 w-5" />
                      Xem chi tiết
                    </DropdownMenuItem>
                    {canDelete && (
                      <DropdownMenuItem 
                        onClick={() => handleDeleteSingle(row, refresh)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-5 w-5 text-destructive" />
                        Xóa
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )
            : (row) => (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push(`/admin/comments/${row.id}`)}
                >
                  <Eye className="mr-2 h-5 w-5" />
                  Xem
                </Button>
              ),
        emptyMessage: "Không tìm thấy bình luận nào phù hợp",
      },
      {
        id: "deleted",
        label: "Đã xóa",
        status: "deleted",
        columns: deletedColumns,
        selectionEnabled: canRestore || canManage,
        selectionActions: canRestore || canManage
          ? ({ selectedIds, clearSelection, refresh }) => (
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <span>
                  Đã chọn <strong>{selectedIds.length}</strong> bình luận (đã xóa)
                </span>
                <div className="flex items-center gap-2">
                  {canRestore && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isBulkProcessing}
                      onClick={() => executeBulk("restore", selectedIds, refresh, clearSelection)}
                    >
                      <RotateCcw className="mr-2 h-5 w-5" />
                      Khôi phục
                    </Button>
                  )}
                  {canManage && (
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={isBulkProcessing}
                      onClick={() => executeBulk("hard-delete", selectedIds, refresh, clearSelection)}
                    >
                      <AlertTriangle className="mr-2 h-5 w-5" />
                      Xóa vĩnh viễn
                    </Button>
                  )}
                  <Button type="button" size="sm" variant="outline" onClick={clearSelection}>
                    Bỏ chọn
                  </Button>
                </div>
              </div>
            )
          : undefined,
        rowActions:
          canRestore || canManage
            ? (row, { refresh }) => (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canRestore && (
                      <DropdownMenuItem onClick={() => handleRestoreSingle(row, refresh)}>
                        <RotateCcw className="mr-2 h-5 w-5" />
                        Khôi phục
                      </DropdownMenuItem>
                    )}
                    {canManage && (
                      <DropdownMenuItem onClick={() => handleHardDeleteSingle(row, refresh)}>
                        <AlertTriangle className="mr-2 h-5 w-5" />
                        Xóa vĩnh viễn
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )
            : undefined,
        emptyMessage: "Không tìm thấy bình luận đã xóa nào",
      },
    ]

    return modes
  }, [
    canDelete,
    canRestore,
    canManage,
    canApprove,
    isBulkProcessing,
    executeBulk,
    handleDeleteSingle,
    handleRestoreSingle,
    handleHardDeleteSingle,
    deletedColumns,
    router,
  ])

  const initialDataByView = useMemo(
    () => (initialData ? { active: initialData } : undefined),
    [initialData],
  )

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteConfirm) return
    try {
      await deleteConfirm.onConfirm()
    } catch {
      // Error already handled in onConfirm
    } finally {
      setDeleteConfirm(null)
    }
  }, [deleteConfirm])

  return (
    <>
      <ResourceTableClient<CommentRow>
        title="Quản lý bình luận"
        baseColumns={baseColumns}
        loader={loader}
        viewModes={viewModes}
        defaultViewId="active"
        initialDataByView={initialDataByView}
        fallbackRowCount={6}
        onRefreshReady={(refresh) => {
          tableRefreshRef.current = refresh
        }}
      />

      <ConfirmDialog
        open={deleteConfirm?.open ?? false}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteConfirm(null)
          }
        }}
        title={deleteConfirm?.type === "hard" ? "Xóa vĩnh viễn?" : "Xóa bình luận?"}
        description={
          deleteConfirm?.type === "hard"
            ? deleteConfirm.bulkIds
              ? `Bạn có chắc chắn muốn xóa vĩnh viễn ${deleteConfirm.bulkIds.length} bình luận đã chọn? Hành động này không thể hoàn tác.`
              : `Bạn có chắc chắn muốn xóa vĩnh viễn bình luận này? Hành động này không thể hoàn tác.`
            : deleteConfirm?.bulkIds
              ? `Bạn có chắc chắn muốn xóa ${deleteConfirm.bulkIds.length} bình luận đã chọn?`
              : `Bạn có chắc chắn muốn xóa bình luận này?`
        }
        confirmLabel={deleteConfirm?.type === "hard" ? "Xóa vĩnh viễn" : "Xóa"}
        cancelLabel="Hủy"
        variant={deleteConfirm?.type === "hard" ? "destructive" : "default"}
        onConfirm={handleDeleteConfirm}
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

