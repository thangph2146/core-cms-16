"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { RotateCcw, Trash2, MoreHorizontal, AlertTriangle, Eye, Plus } from "lucide-react"

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
import { ResourceTableClient } from "@/features/admin/resources/components/resource-table.client"
import type { ResourceViewMode } from "@/features/admin/resources/types"
import { useDynamicFilterOptions } from "@/features/admin/resources/hooks/use-dynamic-filter-options"
import { apiClient } from "@/lib/api/axios"
import { apiRoutes } from "@/lib/api/routes"

import type { CategoryRow, CategoriesResponse, CategoriesTableClientProps } from "../types"

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
  row?: CategoryRow
  bulkIds?: string[]
  onConfirm: () => Promise<void>
}

export function CategoriesTableClient({
  canDelete = false,
  canRestore = false,
  canManage = false,
  canCreate = false,
  initialData,
}: CategoriesTableClientProps) {
  const router = useRouter()
  const [isBulkProcessing, setIsBulkProcessing] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackState | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState | null>(null)
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

  const nameFilter = useDynamicFilterOptions({
    optionsEndpoint: apiRoutes.categories.options({ column: "name" }),
  })

  const slugFilter = useDynamicFilterOptions({
    optionsEndpoint: apiRoutes.categories.options({ column: "slug" }),
  })

  const baseColumns = useMemo<DataTableColumn<CategoryRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Tên danh mục",
        filter: {
          type: "select",
          placeholder: "Chọn tên danh mục...",
          searchPlaceholder: "Tìm kiếm...",
          emptyMessage: "Không tìm thấy.",
          options: nameFilter.options,
          onSearchChange: nameFilter.onSearchChange,
          isLoading: nameFilter.isLoading,
        },
        className: "min-w-[150px] max-w-[250px]",
        headerClassName: "min-w-[150px] max-w-[250px]",
      },
      {
        accessorKey: "slug",
        header: "Slug",
        filter: {
          type: "select",
          placeholder: "Chọn slug...",
          searchPlaceholder: "Tìm kiếm...",
          emptyMessage: "Không tìm thấy.",
          options: slugFilter.options,
          onSearchChange: slugFilter.onSearchChange,
          isLoading: slugFilter.isLoading,
        },
        className: "min-w-[150px] max-w-[250px]",
        headerClassName: "min-w-[150px] max-w-[250px]",
      },
      {
        accessorKey: "description",
        header: "Mô tả",
        className: "min-w-[200px] max-w-[400px]",
        headerClassName: "min-w-[200px] max-w-[400px]",
        cell: (row) => row.description ?? <span className="text-muted-foreground">-</span>,
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
    [dateFormatter, nameFilter.options, nameFilter.onSearchChange, nameFilter.isLoading, slugFilter.options, slugFilter.onSearchChange, slugFilter.isLoading],
  )

  const deletedColumns = useMemo<DataTableColumn<CategoryRow>[]>(
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
    async (query: DataTableQueryState, view: ResourceViewMode<CategoryRow>) => {
      const baseUrl = apiRoutes.categories.list({
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

      const response = await apiClient.get<CategoriesResponse>(url)
      const payload = response.data

      return {
        rows: payload.data,
        page: payload.pagination.page,
        limit: payload.pagination.limit,
        total: payload.pagination.total,
        totalPages: payload.pagination.totalPages,
      } satisfies DataTableResult<CategoryRow>
    },
    [],
  )

  const handleDeleteSingle = useCallback(
    (row: CategoryRow, refresh: () => void) => {
      if (!canDelete) return
      setDeleteConfirm({
        open: true,
        type: "soft",
        row,
        onConfirm: async () => {
          try {
            await apiClient.delete(apiRoutes.categories.delete(row.id))
            showFeedback("success", "Xóa thành công", `Đã xóa danh mục ${row.name}`)
            refresh()
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định"
            showFeedback("error", "Xóa thất bại", `Không thể xóa danh mục ${row.name}`, errorMessage)
            throw error
          }
        },
      })
    },
    [canDelete, showFeedback],
  )

  const handleHardDeleteSingle = useCallback(
    (row: CategoryRow, refresh: () => void) => {
      if (!canManage) return
      setDeleteConfirm({
        open: true,
        type: "hard",
        row,
        onConfirm: async () => {
          try {
            await apiClient.delete(apiRoutes.categories.hardDelete(row.id))
            showFeedback("success", "Xóa vĩnh viễn thành công", `Đã xóa vĩnh viễn danh mục ${row.name}`)
            refresh()
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định"
            showFeedback("error", "Xóa vĩnh viễn thất bại", `Không thể xóa vĩnh viễn danh mục ${row.name}`, errorMessage)
            throw error
          }
        },
      })
    },
    [canManage, showFeedback],
  )

  const handleRestoreSingle = useCallback(
    async (row: CategoryRow, refresh: () => void) => {
      if (!canRestore) return

      try {
        await apiClient.post(apiRoutes.categories.restore(row.id))
        refresh()
      } catch (error) {
        console.error("Failed to restore category", error)
      }
    },
    [canRestore],
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
              await apiClient.post(apiRoutes.categories.bulk, { action, ids })
              showFeedback("success", "Xóa thành công", `Đã xóa ${ids.length} danh mục`)
              clearSelection()
              refresh()
            } catch (error: unknown) {
              const errorMessage = error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định"
              showFeedback("error", "Xóa hàng loạt thất bại", `Không thể xóa ${ids.length} danh mục`, errorMessage)
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
              await apiClient.post(apiRoutes.categories.bulk, { action, ids })
              showFeedback("success", "Xóa vĩnh viễn thành công", `Đã xóa vĩnh viễn ${ids.length} danh mục`)
              clearSelection()
              refresh()
            } catch (error: unknown) {
              const errorMessage = error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định"
              showFeedback("error", "Xóa vĩnh viễn thất bại", `Không thể xóa vĩnh viễn ${ids.length} danh mục`, errorMessage)
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
            await apiClient.post(apiRoutes.categories.bulk, { action, ids })
            showFeedback("success", "Khôi phục thành công", `Đã khôi phục ${ids.length} danh mục`)
            clearSelection()
            refresh()
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định"
            showFeedback("error", "Khôi phục thất bại", `Không thể khôi phục ${ids.length} danh mục`, errorMessage)
          } finally {
            setIsBulkProcessing(false)
          }
        })()
      }
    },
    [showFeedback],
  )

  const viewModes = useMemo<ResourceViewMode<CategoryRow>[]>(() => {
    const modes: ResourceViewMode<CategoryRow>[] = [
      {
        id: "active",
        label: "Đang hoạt động",
        status: "active",
        selectionEnabled: canDelete,
        selectionActions: canDelete
          ? ({ selectedIds, clearSelection, refresh }) => (
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <span>
                  Đã chọn <strong>{selectedIds.length}</strong> danh mục
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
                  <Button type="button" size="sm" variant="outline" onClick={clearSelection}>
                    Bỏ chọn
                  </Button>
                </div>
              </div>
            )
          : undefined,
        rowActions:
          canDelete || canRestore
            ? (row, { refresh }) => (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => router.push(`/admin/categories/${row.id}`)}>
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
                  onClick={() => router.push(`/admin/categories/${row.id}`)}
                >
                  <Eye className="mr-2 h-5 w-5" />
                  Xem
                </Button>
              ),
        emptyMessage: "Không tìm thấy danh mục nào phù hợp",
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
                  Đã chọn <strong>{selectedIds.length}</strong> danh mục (đã xóa)
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
        emptyMessage: "Không tìm thấy danh mục đã xóa nào",
      },
    ]

    return modes
  }, [
    canDelete,
    canRestore,
    canManage,
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

  const headerActions = canCreate ? (
    <Button
      type="button"
      size="sm"
      onClick={() => router.push("/admin/categories/new")}
      className="h-8 px-3 text-xs sm:text-sm"
    >
      <Plus className="mr-2 h-5 w-5" />
      Thêm mới
    </Button>
  ) : undefined

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
      <ResourceTableClient<CategoryRow>
        title="Quản lý danh mục"
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

      <ConfirmDialog
        open={deleteConfirm?.open ?? false}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteConfirm(null)
          }
        }}
        title={deleteConfirm?.type === "hard" ? "Xóa vĩnh viễn?" : "Xóa danh mục?"}
        description={
          deleteConfirm?.type === "hard"
            ? deleteConfirm.bulkIds
              ? `Bạn có chắc chắn muốn xóa vĩnh viễn ${deleteConfirm.bulkIds.length} danh mục đã chọn? Hành động này không thể hoàn tác.`
              : `Bạn có chắc chắn muốn xóa vĩnh viễn danh mục "${deleteConfirm?.row?.name}"? Hành động này không thể hoàn tác.`
            : deleteConfirm?.bulkIds
              ? `Bạn có chắc chắn muốn xóa ${deleteConfirm.bulkIds.length} danh mục đã chọn?`
              : `Bạn có chắc chắn muốn xóa danh mục "${deleteConfirm?.row?.name}"?`
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

