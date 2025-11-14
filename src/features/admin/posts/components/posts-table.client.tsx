"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { RotateCcw, Trash2, MoreHorizontal, AlertTriangle, Eye, Plus } from "lucide-react"
import { AxiosError } from "axios"

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
import { sanitizeSearchQuery } from "@/lib/api/validation"

import type { PostRow, PostsResponse, PostsTableClientProps } from "../types"

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
  row?: PostRow
  bulkIds?: string[]
  onConfirm: () => Promise<void>
}

export function PostsTableClient({
  canDelete = false,
  canRestore = false,
  canManage = false,
  canCreate = false,
  initialData,
}: PostsTableClientProps) {
  const router = useRouter()
  const [isBulkProcessing, setIsBulkProcessing] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackState | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState | null>(null)
  const [togglingPosts, setTogglingPosts] = useState<Set<string>>(new Set())
  const tableRefreshRef = useRef<(() => void) | null>(null)
  const canToggleStatus = canManage || canRestore

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

  const handleTogglePublished = useCallback(
    async (row: PostRow, newStatus: boolean, refresh: () => void) => {
      if (!canToggleStatus) {
        showFeedback("error", "Không có quyền", "Bạn không có quyền thay đổi trạng thái xuất bản")
        return
      }

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
        refresh()
      } catch (error) {
        console.error("Error toggling post publish status:", error)
        showFeedback(
          "error",
          "Lỗi cập nhật",
          `Không thể ${newStatus ? "xuất bản" : "chuyển sang bản nháp"} bài viết. Vui lòng thử lại.`,
        )
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

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [],
  )

  const titleFilter = useDynamicFilterOptions({
    optionsEndpoint: apiRoutes.posts.options({ column: "title" }),
  })

  const slugFilter = useDynamicFilterOptions({
    optionsEndpoint: apiRoutes.posts.options({ column: "slug" }),
  })

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
          <div className="flex flex-col gap-1">
            <span className="font-medium">{row.title}</span>
            {row.excerpt && (
              <span className="text-xs text-muted-foreground line-clamp-1">{row.excerpt}</span>
            )}
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
                  const refresh = tableRefreshRef.current
                  if (!refresh) return
                  handleTogglePublished(row, checked, refresh)
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
      handleTogglePublished,
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

  const loader = useCallback(
    async (query: DataTableQueryState, view: ResourceViewMode<PostRow>) => {
      // Build base URL with apiRoutes
      const safePage = Number.isFinite(query.page) && query.page > 0 ? query.page : 1
      const safeLimit = Number.isFinite(query.limit) && query.limit > 0 ? query.limit : 10
      const trimmedSearch = typeof query.search === "string" ? query.search.trim() : ""
      const searchValidation =
        trimmedSearch.length > 0 ? sanitizeSearchQuery(trimmedSearch, 200) : { valid: true, value: "" }
      if (!searchValidation.valid) {
        throw new Error(searchValidation.error || "Từ khóa tìm kiếm không hợp lệ. Vui lòng thử lại.")
      }

      const requestParams: Record<string, string> = {
        page: safePage.toString(),
        limit: safeLimit.toString(),
        status: view.status ?? "active",
      }
      if (searchValidation.value) {
        requestParams.search = searchValidation.value
      }

      Object.entries(query.filters).forEach(([key, value]) => {
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
        const response = await apiClient.get<PostsResponse>(apiRoutes.posts.list(), {
          params: requestParams,
        })
        const payload = response.data

        return {
          rows: payload.data,
          page: payload.pagination.page,
          limit: payload.pagination.limit,
          total: payload.pagination.total,
          totalPages: payload.pagination.totalPages,
        } satisfies DataTableResult<PostRow>
      } catch (error) {
        console.error("Failed to load posts", error)
        if (error instanceof AxiosError) {
          const apiMessage =
            (error.response?.data as { error?: string } | undefined)?.error ||
            error.message
          throw new Error(apiMessage || "Không thể tải danh sách bài viết. Vui lòng thử lại sau.")
        }
        throw new Error("Không thể tải danh sách bài viết. Vui lòng thử lại sau.")
      }
    },
    [],
  )

  const handleDeleteSingle = useCallback(
    (row: PostRow, refresh: () => void) => {
      if (!canDelete) return
      setDeleteConfirm({
        open: true,
        type: "soft",
        row,
        onConfirm: async () => {
          try {
            await apiClient.delete(apiRoutes.posts.delete(row.id))
            showFeedback("success", "Xóa thành công", `Đã xóa bài viết "${row.title}"`)
            refresh()
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định"
            showFeedback("error", "Xóa thất bại", `Không thể xóa bài viết "${row.title}"`, errorMessage)
            throw error
          }
        },
      })
    },
    [canDelete, showFeedback],
  )

  const handleHardDeleteSingle = useCallback(
    (row: PostRow, refresh: () => void) => {
      if (!canManage) return
      setDeleteConfirm({
        open: true,
        type: "hard",
        row,
        onConfirm: async () => {
          try {
            await apiClient.delete(apiRoutes.posts.hardDelete(row.id))
            showFeedback("success", "Xóa vĩnh viễn thành công", `Đã xóa vĩnh viễn bài viết "${row.title}"`)
            refresh()
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định"
            showFeedback("error", "Xóa vĩnh viễn thất bại", `Không thể xóa vĩnh viễn bài viết "${row.title}"`, errorMessage)
            throw error
          }
        },
      })
    },
    [canManage, showFeedback],
  )

  const handleRestoreSingle = useCallback(
    async (row: PostRow, refresh: () => void) => {
      if (!canRestore) return

      try {
        await apiClient.post(apiRoutes.posts.restore(row.id))
        showFeedback("success", "Khôi phục thành công", `Đã khôi phục bài viết "${row.title}"`)
        refresh()
      } catch (error) {
        console.error("Failed to restore post", error)
        showFeedback("error", "Khôi phục thất bại", `Không thể khôi phục bài viết "${row.title}"`)
      }
    },
    [canRestore, showFeedback],
  )

  const executeBulk = useCallback(
    (action: "delete" | "restore" | "hard-delete", ids: string[], refresh: () => void, clearSelection: () => void) => {
      if (ids.length === 0) return

      if (action === "delete") {
        setDeleteConfirm({
          open: true,
          type: "soft",
          bulkIds: ids,
          onConfirm: async () => {
            setIsBulkProcessing(true)
            try {
              await apiClient.post(apiRoutes.posts.bulk, { action, ids })
              showFeedback("success", "Xóa thành công", `Đã xóa ${ids.length} bài viết`)
              clearSelection()
              refresh()
            } catch (error: unknown) {
              const errorMessage = error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định"
              showFeedback("error", "Xóa hàng loạt thất bại", `Không thể xóa ${ids.length} bài viết`, errorMessage)
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
              await apiClient.post(apiRoutes.posts.bulk, { action, ids })
              showFeedback("success", "Xóa vĩnh viễn thành công", `Đã xóa vĩnh viễn ${ids.length} bài viết`)
              clearSelection()
              refresh()
            } catch (error: unknown) {
              const errorMessage = error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định"
              showFeedback("error", "Xóa vĩnh viễn thất bại", `Không thể xóa vĩnh viễn ${ids.length} bài viết`, errorMessage)
              throw error
            } finally {
              setIsBulkProcessing(false)
            }
          },
        })
      } else {
        // restore action - no confirmation needed
        setIsBulkProcessing(true)
        ;(async () => {
          try {
            await apiClient.post(apiRoutes.posts.bulk, { action, ids })
            showFeedback("success", "Khôi phục thành công", `Đã khôi phục ${ids.length} bài viết`)
            clearSelection()
            refresh()
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định"
            showFeedback("error", "Khôi phục thất bại", `Không thể khôi phục ${ids.length} bài viết`, errorMessage)
          } finally {
            setIsBulkProcessing(false)
          }
        })()
      }
    },
    [showFeedback],
  )

  const viewModes = useMemo<ResourceViewMode<PostRow>[]>(() => {
    const modes: ResourceViewMode<PostRow>[] = [
      {
        id: "active",
        label: "Đang hoạt động",
        status: "active",
        selectionEnabled: canDelete,
        selectionActions: canDelete
          ? ({ selectedIds, clearSelection, refresh }) => (
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <span>
                  Đã chọn <strong>{selectedIds.length}</strong> bài viết
                </span>
                <div className="flex items-center gap-2">
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
                  <Button type="button" size="sm" variant="ghost" onClick={clearSelection}>
                    Bỏ chọn
                  </Button>
                </div>
              </div>
            )
          : undefined,
        rowActions:
          canDelete
            ? (row, { refresh }) => (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => router.push(`/admin/posts/${row.id}`)}>
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
                  onClick={() => router.push(`/admin/posts/${row.id}`)}
                >
                  <Eye className="mr-2 h-5 w-5" />
                  Xem
                </Button>
              ),
        emptyMessage: "Không tìm thấy bài viết nào phù hợp",
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
                  Đã chọn <strong>{selectedIds.length}</strong> bài viết (đã xóa)
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
                  <Button type="button" size="sm" variant="ghost" onClick={clearSelection}>
                    Bỏ chọn
                  </Button>
                </div>
              </div>
            )
          : undefined,
        rowActions: canRestore || canManage
          ? (row, { refresh }) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => router.push(`/admin/posts/${row.id}`)}>
                    <Eye className="mr-2 h-5 w-5" />
                    Xem chi tiết
                  </DropdownMenuItem>
                  {canRestore && (
                    <DropdownMenuItem onClick={() => handleRestoreSingle(row, refresh)}>
                      <RotateCcw className="mr-2 h-5 w-5" />
                      Khôi phục
                    </DropdownMenuItem>
                  )}
                  {canManage && (
                    <DropdownMenuItem
                      onClick={() => handleHardDeleteSingle(row, refresh)}
                      className="text-destructive focus:text-destructive"
                    >
                      <AlertTriangle className="mr-2 h-5 w-5" />
                      Xóa vĩnh viễn
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )
          : (row) => (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/admin/posts/${row.id}`)}
              >
                <Eye className="mr-2 h-5 w-5" />
                Xem
              </Button>
            ),
        emptyMessage: "Không có bài viết đã xóa",
      },
    ]

    return modes
  }, [canDelete, canRestore, canManage, deletedColumns, executeBulk, handleDeleteSingle, handleRestoreSingle, handleHardDeleteSingle, isBulkProcessing, router])

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

  const getDeleteConfirmTitle = () => {
    if (!deleteConfirm) return ""
    if (deleteConfirm.type === "hard") {
      return deleteConfirm.bulkIds
        ? `Xóa vĩnh viễn ${deleteConfirm.bulkIds.length} bài viết?`
        : `Xóa vĩnh viễn bài viết "${deleteConfirm.row?.title}"?`
    }
    return deleteConfirm.bulkIds
      ? `Xóa ${deleteConfirm.bulkIds.length} bài viết?`
      : `Xóa bài viết "${deleteConfirm.row?.title}"?`
  }

  const getDeleteConfirmDescription = () => {
    if (!deleteConfirm) return ""
    if (deleteConfirm.type === "hard") {
      return deleteConfirm.bulkIds
        ? `Hành động này sẽ xóa vĩnh viễn ${deleteConfirm.bulkIds.length} bài viết khỏi hệ thống. Dữ liệu sẽ không thể khôi phục. Bạn có chắc chắn muốn tiếp tục?`
        : `Hành động này sẽ xóa vĩnh viễn bài viết "${deleteConfirm.row?.title}" khỏi hệ thống. Dữ liệu sẽ không thể khôi phục. Bạn có chắc chắn muốn tiếp tục?`
    }
    return deleteConfirm.bulkIds
      ? `Bạn có chắc chắn muốn xóa ${deleteConfirm.bulkIds.length} bài viết? Chúng sẽ được chuyển vào thùng rác và có thể khôi phục sau.`
      : `Bạn có chắc chắn muốn xóa bài viết "${deleteConfirm.row?.title}"? Bài viết sẽ được chuyển vào thùng rác và có thể khôi phục sau.`
  }

  const headerActions = canCreate ? (
    <Button
      type="button"
      size="sm"
      onClick={() => router.push("/admin/posts/new")}
      className="h-8 px-3 text-xs sm:text-sm"
    >
      <Plus className="mr-2 h-5 w-5" />
      Thêm mới
    </Button>
  ) : undefined

  return (
    <>
      <ResourceTableClient<PostRow>
        title="Quản lý bài viết"
        baseColumns={baseColumns}
        loader={loader}
        viewModes={viewModes}
        defaultViewId="active"
        initialDataByView={initialDataByView}
        fallbackRowCount={6}
        headerActions={headerActions}
        onRefreshReady={(refresh) => {
          tableRefreshRef.current = refresh
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
          variant={deleteConfirm.type === "hard" ? "destructive" : "destructive"}
          confirmLabel={deleteConfirm.type === "hard" ? "Xóa vĩnh viễn" : "Xóa"}
          cancelLabel="Hủy"
          onConfirm={handleDeleteConfirm}
          isLoading={isBulkProcessing}
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
