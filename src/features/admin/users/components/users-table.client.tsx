"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { RotateCcw, Trash2, MoreHorizontal, AlertTriangle } from "lucide-react"

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
import { cn } from "@/lib/utils"
import { apiClient } from "@/lib/api/axios"

import type { UserRow, UsersResponse, UsersTableClientProps } from "../types"

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
  row?: UserRow
  bulkIds?: string[]
  onConfirm: () => Promise<void>
}

interface RoleOption {
  id: string
  name: string
  displayName: string
}

export function UsersTableClient({
  canDelete = false,
  canRestore = false,
  canManage = false,
  initialData,
}: UsersTableClientProps) {
  const [isBulkProcessing, setIsBulkProcessing] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackState | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState | null>(null)
  const [rolesOptions, setRolesOptions] = useState<Array<{ label: string; value: string }>>([])

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


  // Fetch roles for filter options
  useEffect(() => {
    async function fetchRoles() {
      try {
        const response = await apiClient.get<{ data: RoleOption[] }>("/roles")
        const options = response.data.data.map((role) => ({
          label: role.displayName,
          value: role.name,
        }))
        setRolesOptions(options)
      } catch (error) {
        console.error("Error fetching roles", error)
      }
    }
    fetchRoles()
  }, [])

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [],
  )

  const baseColumns = useMemo<DataTableColumn<UserRow>[]>(
    () => [
      {
        accessorKey: "email",
        header: "Email",
        filter: { placeholder: "Lọc email..." },
        searchable: true,
        className: "min-w-[200px] max-w-[300px]",
        headerClassName: "min-w-[200px] max-w-[300px]",
      },
      {
        accessorKey: "name",
        header: "Tên",
        filter: { placeholder: "Lọc tên..." },
        searchable: true,
        className: "min-w-[150px] max-w-[250px]",
        headerClassName: "min-w-[150px] max-w-[250px]",
        cell: (row) => row.name ?? "-",
      },
      {
        accessorKey: "roles",
        header: "Vai trò",
        filter: {
          type: "command",
          placeholder: "Chọn vai trò...",
          searchPlaceholder: "Tìm kiếm vai trò...",
          emptyMessage: "Không tìm thấy vai trò.",
          options: rolesOptions,
        },
        className: "min-w-[120px] max-w-[200px]",
        headerClassName: "min-w-[120px] max-w-[200px]",
        cell: (row) =>
          row.roles.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {row.roles.map((role) => (
                <span
                  key={role.id}
                  className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground"
                >
                  {role.displayName}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground">-</span>
          ),
      },
      {
        accessorKey: "isActive",
        header: "Trạng thái",
        filter: {
          type: "command",
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
            <span
              className={cn(
                "inline-flex min-w-[88px] items-center justify-center rounded-full px-2 py-1 text-xs font-medium",
                row.isActive ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-700",
              )}
            >
              {row.isActive ? "Active" : "Inactive"}
            </span>
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
    [dateFormatter, rolesOptions],
  )

  const deletedColumns = useMemo<DataTableColumn<UserRow>[]>(
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
    async (query: DataTableQueryState, view: ResourceViewMode<UserRow>) => {
      const params = new URLSearchParams({
        page: String(query.page),
        limit: String(query.limit),
        status: view.status ?? "active",
      })

      if (query.search.trim().length > 0) {
        params.set("search", query.search.trim())
      }

      Object.entries(query.filters).forEach(([key, value]) => {
        if (value) {
          params.set(`filter[${key}]`, value)
        }
      })

      const response = await apiClient.get<UsersResponse>(`/users?${params.toString()}`)
      const payload = response.data

      return {
        rows: payload.data,
        page: payload.pagination.page,
        limit: payload.pagination.limit,
        total: payload.pagination.total,
        totalPages: payload.pagination.totalPages,
      } satisfies DataTableResult<UserRow>
    },
    [],
  )

  const handleDeleteSingle = useCallback(
    (row: UserRow, refresh: () => void) => {
      if (!canDelete) return
      setDeleteConfirm({
        open: true,
        type: "soft",
        row,
        onConfirm: async () => {
          try {
            await apiClient.delete(`/users/${row.id}`)
            showFeedback("success", "Xóa thành công", `Đã xóa người dùng ${row.email}`)
            refresh()
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định"
            showFeedback("error", "Xóa thất bại", `Không thể xóa người dùng ${row.email}`, errorMessage)
            throw error
          }
        },
      })
    },
        [canDelete, showFeedback],
  )

  const handleHardDeleteSingle = useCallback(
    (row: UserRow, refresh: () => void) => {
      if (!canManage) return
      setDeleteConfirm({
        open: true,
        type: "hard",
        row,
        onConfirm: async () => {
          try {
            await apiClient.delete(`/users/${row.id}/hard-delete`)
            showFeedback("success", "Xóa vĩnh viễn thành công", `Đã xóa vĩnh viễn người dùng ${row.email}`)
            refresh()
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định"
            showFeedback("error", "Xóa vĩnh viễn thất bại", `Không thể xóa vĩnh viễn người dùng ${row.email}`, errorMessage)
            throw error
          }
        },
      })
    },
    [canManage, showFeedback],
  )

  const handleRestoreSingle = useCallback(
    async (row: UserRow, refresh: () => void) => {
      if (!canRestore) return

      try {
        await apiClient.post(`/users/${row.id}/restore`)
        refresh()
      } catch (error) {
        console.error("Failed to restore user", error)
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
              await apiClient.post("/users/bulk", { action, ids })
              showFeedback("success", "Xóa thành công", `Đã xóa ${ids.length} người dùng`)
              clearSelection()
              refresh()
            } catch (error: unknown) {
              const errorMessage = error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định"
              showFeedback("error", "Xóa hàng loạt thất bại", `Không thể xóa ${ids.length} người dùng`, errorMessage)
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
              await apiClient.post("/users/bulk", { action, ids })
              showFeedback("success", "Xóa vĩnh viễn thành công", `Đã xóa vĩnh viễn ${ids.length} người dùng`)
              clearSelection()
              refresh()
            } catch (error: unknown) {
              const errorMessage = error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định"
              showFeedback("error", "Xóa vĩnh viễn thất bại", `Không thể xóa vĩnh viễn ${ids.length} người dùng`, errorMessage)
              throw error
            } finally {
              setIsBulkProcessing(false)
            }
          },
        })
      } else {
        // restore action - no confirmation needed
        setIsBulkProcessing(true)
        apiClient
          .post("/users/bulk", { action, ids })
          .then(() => {
            showFeedback("success", "Khôi phục thành công", `Đã khôi phục ${ids.length} người dùng`)
            clearSelection()
            refresh()
          })
          .catch((error: unknown) => {
            const errorMessage = error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định"
            showFeedback("error", "Khôi phục thất bại", `Không thể khôi phục ${ids.length} người dùng`, errorMessage)
          })
          .finally(() => {
            setIsBulkProcessing(false)
          })
      }
    },
    [showFeedback],
  )

  const viewModes = useMemo<ResourceViewMode<UserRow>[]>(() => {
    const modes: ResourceViewMode<UserRow>[] = [
      {
        id: "active",
        label: "Đang hoạt động",
        status: "active",
        selectionEnabled: canDelete,
        selectionActions: canDelete
          ? ({ selectedIds, clearSelection, refresh }) => (
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <span>
                  Đã chọn <strong>{selectedIds.length}</strong> người dùng
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={isBulkProcessing}
                    onClick={() => executeBulk("delete", selectedIds, refresh, clearSelection)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
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
                      <AlertTriangle className="mr-2 h-4 w-4" />
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
          canDelete || canRestore
            ? (row, { refresh }) => (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canDelete && (
                      <DropdownMenuItem onClick={() => handleDeleteSingle(row, refresh)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Xóa
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )
            : undefined,
        emptyMessage: "Không tìm thấy người dùng nào phù hợp",
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
                  Đã chọn <strong>{selectedIds.length}</strong> người dùng (đã xóa)
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
                      <RotateCcw className="mr-2 h-4 w-4" />
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
                      <AlertTriangle className="mr-2 h-4 w-4" />
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
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleRestoreSingle(row, refresh)}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Khôi phục
                  </DropdownMenuItem>
                  {canManage && (
                    <DropdownMenuItem
                      onClick={() => handleHardDeleteSingle(row, refresh)}
                      className="text-destructive focus:text-destructive"
                    >
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      Xóa vĩnh viễn
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )
          : undefined,
        emptyMessage: "Không có người dùng đã xóa",
      },
    ]

    return modes
  }, [canDelete, canRestore, canManage, deletedColumns, executeBulk, handleDeleteSingle, handleRestoreSingle, handleHardDeleteSingle, isBulkProcessing])

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
        ? `Xóa vĩnh viễn ${deleteConfirm.bulkIds.length} người dùng?`
        : `Xóa vĩnh viễn người dùng ${deleteConfirm.row?.email}?`
    }
    return deleteConfirm.bulkIds
      ? `Xóa ${deleteConfirm.bulkIds.length} người dùng?`
      : `Xóa người dùng ${deleteConfirm.row?.email}?`
  }

  const getDeleteConfirmDescription = () => {
    if (!deleteConfirm) return ""
    if (deleteConfirm.type === "hard") {
      return deleteConfirm.bulkIds
        ? `Hành động này sẽ xóa vĩnh viễn ${deleteConfirm.bulkIds.length} người dùng khỏi hệ thống. Dữ liệu sẽ không thể khôi phục. Bạn có chắc chắn muốn tiếp tục?`
        : `Hành động này sẽ xóa vĩnh viễn người dùng "${deleteConfirm.row?.email}" khỏi hệ thống. Dữ liệu sẽ không thể khôi phục. Bạn có chắc chắn muốn tiếp tục?`
    }
    return deleteConfirm.bulkIds
      ? `Bạn có chắc chắn muốn xóa ${deleteConfirm.bulkIds.length} người dùng? Họ sẽ được chuyển vào thùng rác và có thể khôi phục sau.`
      : `Bạn có chắc chắn muốn xóa người dùng "${deleteConfirm.row?.email}"? Người dùng sẽ được chuyển vào thùng rác và có thể khôi phục sau.`
  }

  return (
    <>
      <ResourceTableClient<UserRow>
        title="Quản lý người dùng"
        baseColumns={baseColumns}
        loader={loader}
        viewModes={viewModes}
        defaultViewId="active"
        initialDataByView={initialDataByView}
        fallbackRowCount={6}
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

