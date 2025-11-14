"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import { useResourceRouter } from "@/hooks/use-resource-segment"
import { RotateCcw, Trash2, MoreHorizontal, AlertTriangle, Eye, Plus } from "lucide-react"

import { ConfirmDialog } from "@/components/dialogs"
import type { DataTableColumn, DataTableQueryState, DataTableResult } from "@/components/tables"
import { FeedbackDialog, type FeedbackVariant } from "@/components/dialogs"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
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

import type { RoleRow, RolesResponse, RolesTableClientProps } from "../types"

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
  row?: RoleRow
  bulkIds?: string[]
  onConfirm: () => Promise<void>
}

export function RolesTableClient({
  canDelete = false,
  canRestore = false,
  canManage = false,
  canCreate = false,
  initialData,
  initialPermissionsOptions: _initialPermissionsOptions = [],
}: RolesTableClientProps) {
  const router = useResourceRouter()
  const [isBulkProcessing, setIsBulkProcessing] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackState | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState | null>(null)
  const [togglingRoles, setTogglingRoles] = useState<Set<string>>(new Set())
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

  // Handler để toggle role status
  const handleToggleStatus = useCallback(
    async (row: RoleRow, newStatus: boolean, refresh: () => void) => {
      if (!canManage) {
        showFeedback("error", "Không có quyền", "Bạn không có quyền thay đổi trạng thái vai trò")
        return
      }

      // Prevent toggling super_admin
      if (row.name === "super_admin") {
        showFeedback("error", "Không thể thay đổi", "Không thể thay đổi trạng thái vai trò super_admin")
        return
      }

      setTogglingRoles((prev) => new Set(prev).add(row.id))

      try {
        await apiClient.put(apiRoutes.roles.update(row.id), {
          isActive: newStatus,
        })

        showFeedback(
          "success",
          "Cập nhật thành công",
          `Đã ${newStatus ? "kích hoạt" : "vô hiệu hóa"} vai trò ${row.displayName}`
        )
        refresh()
      } catch (error) {
        console.error("Error toggling role status:", error)
        showFeedback(
          "error",
          "Lỗi cập nhật",
          `Không thể ${newStatus ? "kích hoạt" : "vô hiệu hóa"} vai trò. Vui lòng thử lại.`
        )
      } finally {
        setTogglingRoles((prev) => {
          const next = new Set(prev)
          next.delete(row.id)
          return next
        })
      }
    },
    [canManage, showFeedback],
  )

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [],
  )

  const nameFilter = useDynamicFilterOptions({
    optionsEndpoint: apiRoutes.roles.options({ column: "name" }),
  })

  const displayNameFilter = useDynamicFilterOptions({
    optionsEndpoint: apiRoutes.roles.options({ column: "displayName" }),
  })

  const baseColumns = useMemo<DataTableColumn<RoleRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Tên vai trò",
        filter: {
          type: "select",
          placeholder: "Chọn tên vai trò...",
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
        accessorKey: "displayName",
        header: "Tên hiển thị",
        filter: {
          type: "select",
          placeholder: "Chọn tên hiển thị...",
          searchPlaceholder: "Tìm kiếm...",
          emptyMessage: "Không tìm thấy.",
          options: displayNameFilter.options,
          onSearchChange: displayNameFilter.onSearchChange,
          isLoading: displayNameFilter.isLoading,
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
        accessorKey: "permissions",
        header: "Quyền",
        className: "min-w-[150px] max-w-[300px]",
        headerClassName: "min-w-[150px] max-w-[300px]",
        cell: (row) =>
          row.permissions.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {row.permissions.slice(0, 3).map((perm) => (
                <span
                  key={perm}
                  className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground"
                >
                  {perm.split(":")[0]}
                </span>
              ))}
              {row.permissions.length > 3 && (
                <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                  +{row.permissions.length - 3}
                </span>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">-</span>
          ),
      },
      {
        accessorKey: "isActive",
        header: "Trạng thái",
        filter: {
          type: "select",
          placeholder: "Chọn trạng thái...",
          searchPlaceholder: "Tìm kiếm...",
          emptyMessage: "Không tìm thấy.",
          options: [
            { label: "Hoạt động", value: "true" },
            { label: "Ngưng hoạt động", value: "false" },
          ],
        },
        className: "w-[120px]",
        headerClassName: "w-[120px]",
        cell: (row) =>
          row.deletedAt ? (
            <span className="inline-flex min-w-[88px] items-center justify-center rounded-full bg-rose-100 px-2 py-1 text-xs font-medium text-rose-700">
              Đã xóa
            </span>
          ) : (
            <div className="flex items-center gap-2">
              <Switch
                checked={row.isActive}
                disabled={togglingRoles.has(row.id) || !canManage || row.name === "super_admin"}
                onCheckedChange={(checked) => {
                  if (tableRefreshRef.current) {
                    handleToggleStatus(row, checked, tableRefreshRef.current)
                  }
                }}
                aria-label={row.isActive ? "Vô hiệu hóa vai trò" : "Kích hoạt vai trò"}
              />
              <span className="text-xs text-muted-foreground">
                {row.isActive ? "Hoạt động" : "Tạm khóa"}
              </span>
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
    [dateFormatter, nameFilter.options, nameFilter.onSearchChange, nameFilter.isLoading, displayNameFilter.options, displayNameFilter.onSearchChange, displayNameFilter.isLoading, togglingRoles, canManage, handleToggleStatus],
  )

  const deletedColumns = useMemo<DataTableColumn<RoleRow>[]>(
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
    async (query: DataTableQueryState, view: ResourceViewMode<RoleRow>) => {
      const baseUrl = apiRoutes.roles.list({
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

      const response = await apiClient.get<RolesResponse>(url)
      const payload = response.data

      return {
        rows: payload.data,
        page: payload.pagination.page,
        limit: payload.pagination.limit,
        total: payload.pagination.total,
        totalPages: payload.pagination.totalPages,
      } satisfies DataTableResult<RoleRow>
    },
    [],
  )

  const handleDeleteSingle = useCallback(
    (row: RoleRow, refresh: () => void) => {
      if (!canDelete) return
      if (row.name === "super_admin") {
        showFeedback("error", "Không thể xóa", "Không thể xóa vai trò super_admin")
        return
      }
      setDeleteConfirm({
        open: true,
        type: "soft",
        row,
        onConfirm: async () => {
          try {
            await apiClient.delete(apiRoutes.roles.delete(row.id))
            showFeedback("success", "Xóa thành công", `Đã xóa vai trò ${row.displayName}`)
            refresh()
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định"
            showFeedback("error", "Xóa thất bại", `Không thể xóa vai trò ${row.displayName}`, errorMessage)
            throw error
          }
        },
      })
    },
    [canDelete, showFeedback],
  )

  const handleHardDeleteSingle = useCallback(
    (row: RoleRow, refresh: () => void) => {
      if (!canManage) return
      if (row.name === "super_admin") {
        showFeedback("error", "Không thể xóa", "Không thể xóa vĩnh viễn vai trò super_admin")
        return
      }
      setDeleteConfirm({
        open: true,
        type: "hard",
        row,
        onConfirm: async () => {
          try {
            await apiClient.delete(apiRoutes.roles.hardDelete(row.id))
            showFeedback("success", "Xóa vĩnh viễn thành công", `Đã xóa vĩnh viễn vai trò ${row.displayName}`)
            refresh()
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định"
            showFeedback("error", "Xóa vĩnh viễn thất bại", `Không thể xóa vĩnh viễn vai trò ${row.displayName}`, errorMessage)
            throw error
          }
        },
      })
    },
    [canManage, showFeedback],
  )

  const handleRestoreSingle = useCallback(
    async (row: RoleRow, refresh: () => void) => {
      if (!canRestore) return

      try {
        await apiClient.post(apiRoutes.roles.restore(row.id))
        refresh()
      } catch (error) {
        console.error("Failed to restore role", error)
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
              await apiClient.post(apiRoutes.roles.bulk, { action, ids })
              showFeedback("success", "Xóa thành công", `Đã xóa ${ids.length} vai trò`)
              clearSelection()
              refresh()
            } catch (error: unknown) {
              const errorMessage = error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định"
              showFeedback("error", "Xóa hàng loạt thất bại", `Không thể xóa ${ids.length} vai trò`, errorMessage)
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
              await apiClient.post(apiRoutes.roles.bulk, { action, ids })
              showFeedback("success", "Xóa vĩnh viễn thành công", `Đã xóa vĩnh viễn ${ids.length} vai trò`)
              clearSelection()
              refresh()
            } catch (error: unknown) {
              const errorMessage = error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định"
              showFeedback("error", "Xóa vĩnh viễn thất bại", `Không thể xóa vĩnh viễn ${ids.length} vai trò`, errorMessage)
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
            await apiClient.post(apiRoutes.roles.bulk, { action, ids })
            showFeedback("success", "Khôi phục thành công", `Đã khôi phục ${ids.length} vai trò`)
            clearSelection()
            refresh()
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định"
            showFeedback("error", "Khôi phục thất bại", `Không thể khôi phục ${ids.length} vai trò`, errorMessage)
          } finally {
            setIsBulkProcessing(false)
          }
        })()
      }
    },
    [showFeedback],
  )

  const viewModes = useMemo<ResourceViewMode<RoleRow>[]>(() => {
    const modes: ResourceViewMode<RoleRow>[] = [
      {
        id: "active",
        label: "Đang hoạt động",
        status: "active",
        selectionEnabled: canDelete,
        selectionActions: canDelete
          ? ({ selectedIds, clearSelection, refresh }) => (
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <span>
                  Đã chọn <strong>{selectedIds.length}</strong> vai trò
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
                    <DropdownMenuItem onClick={() => router.push(`/admin/roles/${row.id}`)}>
                      <Eye className="mr-2 h-5 w-5" />
                      Xem chi tiết
                    </DropdownMenuItem>
                    {canDelete && row.name !== "super_admin" && (
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
                  onClick={() => router.push(`/admin/roles/${row.id}`)}
                >
                  <Eye className="mr-2 h-5 w-5" />
                  Xem
                </Button>
              ),
        emptyMessage: "Không tìm thấy vai trò nào phù hợp",
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
                  Đã chọn <strong>{selectedIds.length}</strong> vai trò (đã xóa)
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
        rowActions: canRestore || canManage
          ? (row, { refresh }) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => router.push(`/admin/roles/${row.id}`)}>
                    <Eye className="mr-2 h-5 w-5" />
                    Xem chi tiết
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleRestoreSingle(row, refresh)}>
                    <RotateCcw className="mr-2 h-5 w-5" />
                    Khôi phục
                  </DropdownMenuItem>
                  {canManage && row.name !== "super_admin" && (
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
                onClick={() => router.push(`/admin/roles/${row.id}`)}
              >
                <Eye className="mr-2 h-5 w-5" />
                Xem
              </Button>
            ),
        emptyMessage: "Không có vai trò đã xóa",
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
        ? `Xóa vĩnh viễn ${deleteConfirm.bulkIds.length} vai trò?`
        : `Xóa vĩnh viễn vai trò ${deleteConfirm.row?.displayName}?`
    }
    return deleteConfirm.bulkIds
      ? `Xóa ${deleteConfirm.bulkIds.length} vai trò?`
      : `Xóa vai trò ${deleteConfirm.row?.displayName}?`
  }

  const getDeleteConfirmDescription = () => {
    if (!deleteConfirm) return ""
    if (deleteConfirm.type === "hard") {
      return deleteConfirm.bulkIds
        ? `Hành động này sẽ xóa vĩnh viễn ${deleteConfirm.bulkIds.length} vai trò khỏi hệ thống. Dữ liệu sẽ không thể khôi phục. Bạn có chắc chắn muốn tiếp tục?`
        : `Hành động này sẽ xóa vĩnh viễn vai trò "${deleteConfirm.row?.displayName}" khỏi hệ thống. Dữ liệu sẽ không thể khôi phục. Bạn có chắc chắn muốn tiếp tục?`
    }
    return deleteConfirm.bulkIds
      ? `Bạn có chắc chắn muốn xóa ${deleteConfirm.bulkIds.length} vai trò? Chúng sẽ được chuyển vào thùng rác và có thể khôi phục sau.`
      : `Bạn có chắc chắn muốn xóa vai trò "${deleteConfirm.row?.displayName}"? Vai trò sẽ được chuyển vào thùng rác và có thể khôi phục sau.`
  }

  const headerActions = canCreate ? (
    <Button
      type="button"
      size="sm"
      onClick={() => router.push("/admin/roles/new")}
      className="h-8 px-3 text-xs sm:text-sm"
    >
      <Plus className="mr-2 h-5 w-5" />
      Thêm mới
    </Button>
  ) : undefined

  return (
    <>
      <ResourceTableClient<RoleRow>
        title="Quản lý vai trò"
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

