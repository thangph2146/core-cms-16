"use client"

import { useCallback, useMemo, useState } from "react"
import type { DataTableResult, DataTableColumn, DataTableQueryState } from "@/components/data-table"
import { ResourceTableClient } from "@/features/resources/components/resource-table.client"
import type { ResourceViewMode } from "@/features/resources/types"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { RotateCcw, Trash2, MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"

export interface UserRole {
  id: string
  name: string
  displayName: string
}

export interface UserRow {
  id: string
  email: string
  name: string | null
  isActive: boolean
  createdAt: string
  deletedAt: string | null
  roles: UserRole[]
}

interface UsersResponse {
  data: UserRow[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface UsersTableClientProps {
  canDelete?: boolean
  canRestore?: boolean
  initialData?: DataTableResult<UserRow>
}

export function UsersTableClient({
  canDelete = false,
  canRestore = false,
  initialData,
}: UsersTableClientProps) {
  const [isBulkProcessing, setIsBulkProcessing] = useState(false)
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
      },
      {
        accessorKey: "name",
        header: "Tên",
        filter: { placeholder: "Lọc tên..." },
        searchable: true,
        cell: (row) => row.name ?? "-",
      },
      {
        accessorKey: "roles",
        header: "Vai trò",
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
          type: "select",
          placeholder: "Tất cả trạng thái",
          options: [
            { label: "Hoạt động", value: "true" },
            { label: "Ngưng hoạt động", value: "false" },
          ],
        },
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
        cell: (row) => {
          try {
            return dateFormatter.format(new Date(row.createdAt))
          } catch {
            return row.createdAt
          }
        },
      },
    ],
    [dateFormatter],
  )

  const deletedColumns = useMemo<DataTableColumn<UserRow>[]>(
    () => [
      ...baseColumns,
      {
        accessorKey: "deletedAt",
        header: "Ngày xóa",
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

      const response = await fetch(`/api/users?${params.toString()}`, {
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      })

      if (!response.ok) {
        throw new Error("Failed to fetch users")
      }

      const payload = (await response.json()) as UsersResponse

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
    async (row: UserRow, refresh: () => void) => {
      if (!canDelete) return
      if (!window.confirm(`Bạn có chắc chắn muốn xóa ${row.email}?`)) return

      const response = await fetch(`/api/users/${row.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        console.error("Failed to delete user", await response.text())
        return
      }

      refresh()
    },
    [canDelete],
  )

  const handleRestoreSingle = useCallback(
    async (row: UserRow, refresh: () => void) => {
      if (!canRestore) return

      const response = await fetch(`/api/users/${row.id}/restore`, {
        method: "POST",
      })

      if (!response.ok) {
        console.error("Failed to restore user", await response.text())
        return
      }

      refresh()
    },
    [canRestore],
  )

  const executeBulk = useCallback(
    async (action: "delete" | "restore", ids: string[], refresh: () => void, clearSelection: () => void) => {
      if (ids.length === 0) return
      setIsBulkProcessing(true)
      try {
        const response = await fetch("/api/users/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, ids }),
        })

        if (!response.ok) {
          console.error("Bulk action failed", await response.text())
          return
        }

        clearSelection()
        refresh()
      } finally {
        setIsBulkProcessing(false)
      }
    },
    [],
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
        selectionEnabled: canRestore,
        selectionActions: canRestore
          ? ({ selectedIds, clearSelection, refresh }) => (
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <span>
                  Đã chọn <strong>{selectedIds.length}</strong> người dùng (đã xóa)
                </span>
                <div className="flex items-center gap-2">
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
                  <Button type="button" size="sm" variant="ghost" onClick={clearSelection}>
                    Bỏ chọn
                  </Button>
                </div>
              </div>
            )
          : undefined,
        rowActions: canRestore
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
                </DropdownMenuContent>
              </DropdownMenu>
            )
          : undefined,
        emptyMessage: "Không có người dùng đã xóa",
      },
    ]

    return modes
  }, [canDelete, canRestore, deletedColumns, executeBulk, handleDeleteSingle, handleRestoreSingle, isBulkProcessing])

  const initialDataByView = useMemo(
    () => (initialData ? { active: initialData } : undefined),
    [initialData],
  )

  return (
    <ResourceTableClient<UserRow>
      title="Quản lý người dùng"
      baseColumns={baseColumns}
      loader={loader}
      viewModes={viewModes}
      defaultViewId="active"
      initialDataByView={initialDataByView}
      fallbackRowCount={6}
      searchPlaceholder="Tìm theo email, tên người dùng..."
    />
  )
}

