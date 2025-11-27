import { useMemo } from "react"
import { Switch } from "@/components/ui/switch"
import type { DataTableColumn } from "@/components/tables"
import { useDynamicFilterOptions } from "@/features/admin/resources/hooks/use-dynamic-filter-options"
import { apiRoutes } from "@/lib/api/routes"
import type { RoleRow } from "../types"

interface UseRoleColumnsOptions {
  togglingRoles: Set<string>
  canManage: boolean
  onToggleStatus: (row: RoleRow, checked: boolean) => void
}

export function useRoleColumns({ togglingRoles, canManage, onToggleStatus }: UseRoleColumnsOptions) {
  const nameFilter = useDynamicFilterOptions({
    optionsEndpoint: apiRoutes.roles.options({ column: "name" }),
  })

  const displayNameFilter = useDynamicFilterOptions({
    optionsEndpoint: apiRoutes.roles.options({ column: "displayName" }),
  })

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [],
  )

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
                onCheckedChange={(checked) => onToggleStatus(row, checked)}
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
    [
      dateFormatter,
      nameFilter.options,
      nameFilter.onSearchChange,
      nameFilter.isLoading,
      displayNameFilter.options,
      displayNameFilter.onSearchChange,
      displayNameFilter.isLoading,
      togglingRoles,
      canManage,
      onToggleStatus,
    ],
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

  return {
    baseColumns,
    deletedColumns,
  }
}

