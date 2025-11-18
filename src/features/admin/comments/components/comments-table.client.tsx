"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useResourceRouter } from "@/hooks/use-resource-segment"
import { RotateCcw, Trash2, MoreHorizontal, AlertTriangle, Eye, Check, X } from "lucide-react"
import type { LucideIcon } from "lucide-react"

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
import { useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"
import { useCommentsSocketBridge } from "@/features/admin/comments/hooks/use-comments-socket-bridge"

import type { AdminCommentsListParams } from "@/lib/query-keys"
import type { CommentRow, CommentsResponse, CommentsTableClientProps } from "../types"
import { logger } from "@/lib/config"

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
  const queryClient = useQueryClient()
  const [isBulkProcessing, setIsBulkProcessing] = useState(false)
  const isBulkProcessingRef = useRef(false) // Ref để tránh race condition
  const [feedback, setFeedback] = useState<FeedbackState | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState | null>(null)
  const [togglingComments, setTogglingComments] = useState<Set<string>>(new Set())
  const tableRefreshRef = useRef<(() => void) | null>(null)
  const tableSoftRefreshRef = useRef<(() => void) | null>(null)
  const pendingRealtimeRefreshRef = useRef(false)

  const { isSocketConnected, cacheVersion } = useCommentsSocketBridge()

  type RowActionConfig = {
    label: string
    icon: LucideIcon
    onSelect: () => void
    destructive?: boolean
    disabled?: boolean
  }

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

      // Không cần optimistic update khi có socket connection
      // Socket event sẽ cập nhật cache ngay sau khi server xử lý xong
      // Optimistic update chỉ khi không có socket (fallback)
      if (!isSocketConnected) {
        queryClient.setQueriesData<DataTableResult<CommentRow>>(
          { queryKey: queryKeys.adminComments.all() as unknown[] },
          (oldData) => {
            if (!oldData) return oldData
            const updatedRows = oldData.rows.map((r) =>
              r.id === row.id ? { ...r, approved: newStatus } : r
            )
            return { ...oldData, rows: updatedRows }
          },
        )
      }

      try {
        if (newStatus) {
          await apiClient.post(apiRoutes.comments.approve(row.id))
          showFeedback("success", "Duyệt thành công", `Đã duyệt bình luận từ ${row.authorName || row.authorEmail}`)
        } else {
          await apiClient.post(apiRoutes.comments.unapprove(row.id))
          showFeedback("success", "Hủy duyệt thành công", `Đã hủy duyệt bình luận từ ${row.authorName || row.authorEmail}`)
        }
        if (!isSocketConnected) {
        refresh()
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định"
        showFeedback("error", newStatus ? "Duyệt thất bại" : "Hủy duyệt thất bại", `Không thể ${newStatus ? "duyệt" : "hủy duyệt"} bình luận`, errorMessage)
        
        // Rollback optimistic update nếu có lỗi
        if (isSocketConnected) {
          queryClient.invalidateQueries({ queryKey: queryKeys.adminComments.all() })
        }
      } finally {
        setTogglingComments((prev) => {
          const next = new Set(prev)
          next.delete(row.id)
          return next
        })
      }
    },
    [canApprove, isSocketConnected, showFeedback, queryClient],
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

  const handleDeleteSingle = useCallback(
    (row: CommentRow, refresh: () => void) => {
      if (!canDelete) return
      setDeleteConfirm({
        open: true,
        type: "soft",
        row,
        onConfirm: async () => {
          try {
            await apiClient.post(apiRoutes.comments.bulk, { action: "delete", ids: [row.id] })
            showFeedback("success", "Xóa thành công", `Đã xóa bình luận của ${row.authorName || row.authorEmail}`)
            if (!isSocketConnected) {
            refresh()
            }
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định"
            showFeedback("error", "Xóa thất bại", `Không thể xóa bình luận của ${row.authorName || row.authorEmail}`, errorMessage)
            throw error
          }
        },
      })
    },
    [canDelete, isSocketConnected, showFeedback],
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
            await apiClient.post(apiRoutes.comments.bulk, { action: "hard-delete", ids: [row.id] })
            showFeedback("success", "Xóa vĩnh viễn thành công", `Đã xóa vĩnh viễn bình luận của ${row.authorName || row.authorEmail}`)
            if (!isSocketConnected) {
            refresh()
            }
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định"
            showFeedback("error", "Xóa vĩnh viễn thất bại", `Không thể xóa vĩnh viễn bình luận của ${row.authorName || row.authorEmail}`, errorMessage)
            throw error
          }
        },
      })
    },
    [canManage, isSocketConnected, showFeedback],
  )

  const handleRestoreSingle = useCallback(
    async (row: CommentRow, refresh: () => void) => {
      if (!canRestore) return

      try {
        await apiClient.post(apiRoutes.comments.bulk, { action: "restore", ids: [row.id] })
        showFeedback("success", "Khôi phục thành công", `Đã khôi phục bình luận của ${row.authorName || row.authorEmail}`)
        if (!isSocketConnected) {
        refresh()
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định"
        showFeedback("error", "Khôi phục thất bại", `Không thể khôi phục bình luận của ${row.authorName || row.authorEmail}`, errorMessage)
        console.error("Failed to restore comment", error)
      }
    },
    [canRestore, isSocketConnected, showFeedback],
  )

  const executeBulk = useCallback(
    (action: "delete" | "restore" | "hard-delete" | "approve" | "unapprove", ids: string[], refresh: () => void, clearSelection: () => void) => {
      if (ids.length === 0) return

      if (action === "delete") {
        setDeleteConfirm({
          open: true,
          type: "soft",
          bulkIds: ids,
          onConfirm: async () => {
            if (isBulkProcessingRef.current) return
            isBulkProcessingRef.current = true
            setIsBulkProcessing(true)
            try {
              await apiClient.post(apiRoutes.comments.bulk, { action, ids })
              showFeedback("success", "Xóa thành công", `Đã xóa ${ids.length} bình luận`)
              clearSelection()
              if (!isSocketConnected) {
              refresh()
              }
            } catch (error: unknown) {
              const errorMessage = error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định"
              showFeedback("error", "Xóa hàng loạt thất bại", `Không thể xóa ${ids.length} bình luận`, errorMessage)
              throw error
            } finally {
              // Luôn reset processing state trong finally để đảm bảo không bị stuck
              isBulkProcessingRef.current = false
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
            if (isBulkProcessingRef.current) return
            isBulkProcessingRef.current = true
            setIsBulkProcessing(true)
            try {
              await apiClient.post(apiRoutes.comments.bulk, { action, ids })
              showFeedback("success", "Xóa vĩnh viễn thành công", `Đã xóa vĩnh viễn ${ids.length} bình luận`)
              clearSelection()
              if (!isSocketConnected) {
              refresh()
              }
            } catch (error: unknown) {
              const errorMessage = error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định"
              showFeedback("error", "Xóa vĩnh viễn thất bại", `Không thể xóa vĩnh viễn ${ids.length} bình luận`, errorMessage)
              throw error
            } finally {
              // Luôn reset processing state trong finally để đảm bảo không bị stuck
              isBulkProcessingRef.current = false
              setIsBulkProcessing(false)
            }
          },
        })
      } else {
        if (isBulkProcessingRef.current) return
        isBulkProcessingRef.current = true
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
            if (!isSocketConnected) {
            refresh()
            }
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định"
            showFeedback("error", "Thao tác thất bại", `Không thể thực hiện thao tác cho ${ids.length} bình luận`, errorMessage)
          } finally {
            // Luôn reset processing state trong finally để đảm bảo không bị stuck
            isBulkProcessingRef.current = false
            setIsBulkProcessing(false)
          }
        })()
      }
    },
    [isSocketConnected, showFeedback],
  )

  const renderRowActions = useCallback(
    (actions: RowActionConfig[]) => {
      if (actions.length === 0) {
        return null
      }

      if (actions.length === 1) {
        const singleAction = actions[0]
        const Icon = singleAction.icon
        return (
          <Button
            variant="ghost"
            size="sm"
            disabled={singleAction.disabled}
            onClick={() => {
              if (singleAction.disabled) return
              singleAction.onSelect()
            }}
          >
            <Icon className="mr-2 h-5 w-5" />
            {singleAction.label}
          </Button>
        )
      }

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {actions.map((action) => {
              const Icon = action.icon
              return (
                <DropdownMenuItem
                  key={action.label}
                  disabled={action.disabled}
                  onClick={() => {
                    if (action.disabled) return
                    action.onSelect()
                  }}
                  className={
                    action.destructive
                      ? "text-destructive focus:text-destructive disabled:opacity-50"
                      : "disabled:opacity-50"
                  }
                >
                  <Icon
                    className={
                      action.destructive ? "mr-2 h-5 w-5 text-destructive" : "mr-2 h-5 w-5"
                    }
                  />
                  {action.label}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
    [],
  )

  const renderActiveRowActions = useCallback(
    (row: CommentRow, { refresh }: { refresh: () => void }) => {
      const actions: RowActionConfig[] = [
        {
          label: "Xem chi tiết",
          icon: Eye,
          onSelect: () => router.push(`/admin/comments/${row.id}`),
        },
      ]

      if (canApprove) {
        if (row.approved) {
          actions.push({
            label: "Hủy duyệt",
            icon: X,
            onSelect: () => {
              if (tableRefreshRef.current) {
                handleToggleApprove(row, false, tableRefreshRef.current)
              }
            },
          })
        } else {
          actions.push({
            label: "Duyệt",
            icon: Check,
            onSelect: () => {
              if (tableRefreshRef.current) {
                handleToggleApprove(row, true, tableRefreshRef.current)
              }
            },
          })
        }
      }

      if (canDelete) {
        actions.push({
          label: "Xóa",
          icon: Trash2,
          onSelect: () => handleDeleteSingle(row, refresh),
          destructive: true,
        })
      }

      if (canManage) {
        actions.push({
          label: "Xóa vĩnh viễn",
          icon: AlertTriangle,
          onSelect: () => handleHardDeleteSingle(row, refresh),
          destructive: true,
        })
      }

      return renderRowActions(actions)
    },
    [canApprove, canDelete, canManage, handleDeleteSingle, handleHardDeleteSingle, handleToggleApprove, renderRowActions, router],
  )

  const renderDeletedRowActions = useCallback(
    (row: CommentRow, { refresh }: { refresh: () => void }) => {
      const actions: RowActionConfig[] = [
        {
          label: "Xem chi tiết",
          icon: Eye,
          onSelect: () => router.push(`/admin/comments/${row.id}`),
        },
      ]

      if (canRestore) {
        actions.push({
          label: "Khôi phục",
          icon: RotateCcw,
          onSelect: () => handleRestoreSingle(row, refresh),
        })
      }

      if (canManage) {
        actions.push({
          label: "Xóa vĩnh viễn",
          icon: AlertTriangle,
          onSelect: () => handleHardDeleteSingle(row, refresh),
          destructive: true,
        })
      }

      return renderRowActions(actions)
    },
    [canManage, canRestore, handleHardDeleteSingle, handleRestoreSingle, renderRowActions, router],
  )

  const viewModes = useMemo<ResourceViewMode<CommentRow>[]>(() => {
    const modes: ResourceViewMode<CommentRow>[] = [
      {
        id: "active",
        label: "Đang hoạt động",
        status: "active",
        selectionEnabled: canDelete || canApprove,
        selectionActions: canDelete || canApprove
          ? ({ selectedIds, selectedRows, clearSelection, refresh }) => {
              const approvedCount = selectedRows.filter((r) => r.approved).length
              const unapprovedCount = selectedRows.filter((r) => !r.approved).length

              return (
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                  <span>
                    Đã chọn <strong>{selectedIds.length}</strong> bình luận
                  </span>
                  <div className="flex items-center gap-2">
                    {canApprove && unapprovedCount > 0 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isBulkProcessing || selectedIds.length === 0}
                        onClick={() => executeBulk("approve", selectedIds, refresh, clearSelection)}
                      >
                        <Check className="mr-2 h-5 w-5" />
                        Duyệt ({unapprovedCount})
                      </Button>
                    )}
                    {canApprove && approvedCount > 0 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isBulkProcessing || selectedIds.length === 0}
                        onClick={() => executeBulk("unapprove", selectedIds, refresh, clearSelection)}
                      >
                        <X className="mr-2 h-5 w-5" />
                        Hủy duyệt ({approvedCount})
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={isBulkProcessing || selectedIds.length === 0}
                        onClick={() => executeBulk("delete", selectedIds, refresh, clearSelection)}
                      >
                        <Trash2 className="mr-2 h-5 w-5" />
                        Xóa đã chọn ({selectedIds.length})
                      </Button>
                    )}
                    {canManage && (
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={isBulkProcessing || selectedIds.length === 0}
                        onClick={() => executeBulk("hard-delete", selectedIds, refresh, clearSelection)}
                      >
                        <AlertTriangle className="mr-2 h-5 w-5" />
                        Xóa vĩnh viễn ({selectedIds.length})
                      </Button>
                    )}
                    <Button type="button" size="sm" variant="ghost" onClick={clearSelection}>
                      Bỏ chọn
                    </Button>
                  </div>
                </div>
              )
            }
          : undefined,
        rowActions: (row, { refresh }) => renderActiveRowActions(row, { refresh }),
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
                      disabled={isBulkProcessing || selectedIds.length === 0}
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
                      disabled={isBulkProcessing || selectedIds.length === 0}
                      onClick={() => executeBulk("hard-delete", selectedIds, refresh, clearSelection)}
                    >
                      <AlertTriangle className="mr-2 h-5 w-5" />
                      Xóa vĩnh viễn ({selectedIds.length})
                    </Button>
                  )}
                  <Button type="button" size="sm" variant="ghost" onClick={clearSelection}>
                    Bỏ chọn
                  </Button>
                </div>
              </div>
            )
          : undefined,
        rowActions: (row, { refresh }) => renderDeletedRowActions(row, { refresh }),
        emptyMessage: "Không tìm thấy bình luận đã xóa nào",
      },
    ]

    return modes
  }, [
    canDelete,
    canRestore,
    canManage,
    canApprove,
    deletedColumns,
    executeBulk,
    isBulkProcessing,
    renderActiveRowActions,
    renderDeletedRowActions,
  ])

  const initialDataByView = useMemo(
    () => (initialData ? { active: initialData } : undefined),
    [initialData],
  )

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

      <ConfirmDialog
        open={deleteConfirm?.open ?? false}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteConfirm(null)
          }
        }}
        title={
          deleteConfirm?.type === "hard"
            ? deleteConfirm.bulkIds
              ? `Xóa vĩnh viễn ${deleteConfirm.bulkIds.length} bình luận?`
              : `Xóa vĩnh viễn bình luận?`
            : deleteConfirm?.bulkIds
              ? `Xóa ${deleteConfirm.bulkIds.length} bình luận?`
              : `Xóa bình luận?`
        }
        description={
          deleteConfirm?.type === "hard"
            ? deleteConfirm.bulkIds
              ? `Hành động này sẽ xóa vĩnh viễn ${deleteConfirm.bulkIds.length} bình luận khỏi hệ thống. Dữ liệu sẽ không thể khôi phục. Bạn có chắc chắn muốn tiếp tục?`
              : `Hành động này sẽ xóa vĩnh viễn bình luận khỏi hệ thống. Dữ liệu sẽ không thể khôi phục. Bạn có chắc chắn muốn tiếp tục?`
            : deleteConfirm?.bulkIds
              ? `Bạn có chắc chắn muốn xóa ${deleteConfirm.bulkIds.length} bình luận? Chúng sẽ được chuyển vào thùng rác và có thể khôi phục sau.`
              : `Bạn có chắc chắn muốn xóa bình luận? Bình luận sẽ được chuyển vào thùng rác và có thể khôi phục sau.`
        }
        confirmLabel={deleteConfirm?.type === "hard" ? "Xóa vĩnh viễn" : "Xóa"}
        cancelLabel="Hủy"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        isLoading={isBulkProcessing}
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

