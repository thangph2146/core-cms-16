/**
 * Column definitions cho posts table
 */

import { useMemo } from "react"
import type { DataTableColumn } from "@/components/tables"
import { useDynamicFilterOptions } from "@/features/admin/resources/hooks/use-dynamic-filter-options"
import { apiRoutes } from "@/lib/api/routes"
import { Switch } from "@/components/ui/switch"
import type { PostRow } from "../types"

interface UsePostColumnsOptions {
  togglingPosts: Set<string>
  canToggleStatus: boolean
  onTogglePublished: (row: PostRow, newStatus: boolean, refresh: () => void) => void
  refreshTable: () => void
}

export function usePostColumns({
  togglingPosts,
  canToggleStatus,
  onTogglePublished,
  refreshTable,
}: UsePostColumnsOptions) {
  const titleFilter = useDynamicFilterOptions({
    optionsEndpoint: apiRoutes.posts.options({ column: "title" }),
  })

  const slugFilter = useDynamicFilterOptions({
    optionsEndpoint: apiRoutes.posts.options({ column: "slug" }),
  })

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [],
  )

  const baseColumns = useMemo<DataTableColumn<PostRow>[]>(
    () => [
      {
        accessorKey: "title",
        header: "Tiêu đề",
        filter: {
          type: "select",
          placeholder: "Tìm kiếm tiêu đề...",
          searchPlaceholder: "Tìm kiếm...",
          emptyMessage: "Không tìm thấy.",
          options: titleFilter.options,
          onSearchChange: titleFilter.onSearchChange,
          isLoading: titleFilter.isLoading,
        },
        className: "min-w-[200px]",
        headerClassName: "min-w-[200px]",
        cell: (row) => (
          <div className="flex flex-col gap-1.5">
            <span className="font-medium">{row.title}</span>
            {row.excerpt && (
              <span className="text-xs text-muted-foreground line-clamp-1">{row.excerpt}</span>
            )}
            {(row.categories && row.categories.length > 0) || (row.tags && row.tags.length > 0) ? (
              <div className="flex flex-wrap gap-1 mt-0.5">
                {row.categories && row.categories.length > 0 && (
                  <>
                    {row.categories.slice(0, 2).map((category) => (
                      <span
                        key={category.id}
                        className="inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary"
                      >
                        {category.name}
                      </span>
                    ))}
                    {row.categories.length > 2 && (
                      <span className="text-xs text-muted-foreground">
                        +{row.categories.length - 2}
                      </span>
                    )}
                  </>
                )}
                {row.tags && row.tags.length > 0 && (
                  <>
                    {row.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag.id}
                        className="inline-flex items-center rounded-md bg-secondary/50 px-1.5 py-0.5 text-xs font-medium text-secondary-foreground"
                      >
                        {tag.name}
                      </span>
                    ))}
                    {row.tags.length > 2 && (
                      <span className="text-xs text-muted-foreground">
                        +{row.tags.length - 2}
                      </span>
                    )}
                  </>
                )}
              </div>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "slug",
        header: "Slug",
        filter: {
          type: "select",
          placeholder: "Tìm kiếm slug...",
          searchPlaceholder: "Tìm kiếm...",
          emptyMessage: "Không tìm thấy.",
          options: slugFilter.options,
          onSearchChange: slugFilter.onSearchChange,
          isLoading: slugFilter.isLoading,
        },
        className: "min-w-[150px]",
        headerClassName: "min-w-[150px]",
        cell: (row) => (
          <span className="text-xs text-muted-foreground font-mono">{row.slug}</span>
        ),
      },
      {
        accessorKey: "author",
        header: "Tác giả",
        className: "min-w-[150px]",
        headerClassName: "min-w-[150px]",
        cell: (row) => (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm">{row.author.name || "N/A"}</span>
            <span className="text-xs text-muted-foreground">{row.author.email}</span>
          </div>
        ),
      },
      {
        accessorKey: "published",
        header: "Trạng thái",
        filter: {
          type: "select",
          placeholder: "Chọn trạng thái",
          searchPlaceholder: "Tìm kiếm...",
          emptyMessage: "Không tìm thấy.",
          options: [
            { label: "Đã xuất bản", value: "true" },
            { label: "Bản nháp", value: "false" },
          ],
        },
        className: "w-[120px]",
        headerClassName: "w-[120px]",
        cell: (row) => {
          if (row.deletedAt) {
            return (
              <span className="inline-flex min-w-[88px] items-center justify-center rounded-full bg-rose-100 px-2 py-1 text-xs font-medium text-rose-700">
                Đã xóa
              </span>
            )
          }

          return (
            <div className="flex items-center gap-2">
              <Switch
                checked={row.published}
                disabled={togglingPosts.has(row.id) || !canToggleStatus}
                onCheckedChange={(checked) => {
                  onTogglePublished(row, checked, refreshTable)
                }}
                aria-label={row.published ? "Chuyển thành bản nháp" : "Xuất bản bài viết"}
              />
              <span className="text-xs text-muted-foreground">
                {row.published ? "Đã xuất bản" : "Bản nháp"}
              </span>
            </div>
          )
        },
      },
      {
        accessorKey: "publishedAt",
        header: "Ngày xuất bản",
        filter: {
          type: "date",
          placeholder: "Chọn ngày xuất bản",
          dateFormat: "dd/MM/yyyy",
        },
        className: "min-w-[140px] max-w-[180px]",
        headerClassName: "min-w-[140px] max-w-[180px]",
        cell: (row) => {
          if (!row.publishedAt) return "-"
          try {
            return dateFormatter.format(new Date(row.publishedAt))
          } catch {
            return row.publishedAt
          }
        },
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
      titleFilter.options,
      titleFilter.onSearchChange,
      titleFilter.isLoading,
      slugFilter.options,
      slugFilter.onSearchChange,
      slugFilter.isLoading,
      togglingPosts,
      canToggleStatus,
      onTogglePublished,
      refreshTable,
    ],
  )

  const deletedColumns = useMemo<DataTableColumn<PostRow>[]>(
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

