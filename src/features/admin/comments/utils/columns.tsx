import { useMemo } from "react"
import { Switch } from "@/components/ui/switch"
import type { DataTableColumn } from "@/components/tables"
import { useDynamicFilterOptions } from "@/features/admin/resources/hooks/use-dynamic-filter-options"
import { apiRoutes } from "@/lib/api/routes"
import type { CommentRow } from "../types"

interface UseCommentColumnsOptions {
  togglingComments: Set<string>
  canApprove: boolean
  onToggleApprove: (row: CommentRow, checked: boolean) => void
}

export function useCommentColumns({ togglingComments, canApprove, onToggleApprove }: UseCommentColumnsOptions) {
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

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [],
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
        cell: (row) =>
          row.deletedAt ? (
            <span className="inline-flex min-w-[88px] items-center justify-center rounded-full bg-rose-100 px-2 py-1 text-xs font-medium text-rose-700">
              Đã xóa
            </span>
          ) : (
            <div className="flex items-center gap-2">
              <Switch
                checked={row.approved}
                disabled={togglingComments.has(row.id) || !canApprove}
                onCheckedChange={(checked) => onToggleApprove(row, checked)}
                aria-label={row.approved ? "Hủy duyệt bình luận" : "Duyệt bình luận"}
              />
              <span className="text-xs text-muted-foreground">
                {row.approved ? "Đã duyệt" : "Chờ duyệt"}
              </span>
            </div>
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
      onToggleApprove,
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

  return {
    baseColumns,
    deletedColumns,
  }
}

