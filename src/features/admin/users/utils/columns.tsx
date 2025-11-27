import { useMemo } from "react"
import type { DataTableColumn } from "@/components/tables"
import { useDynamicFilterOptions } from "@/features/admin/resources/hooks/use-dynamic-filter-options"
import { apiRoutes } from "@/lib/api/routes"
import type { UserRow } from "../types"
import { Switch } from "@/components/ui/switch"
import { USER_MESSAGES, PROTECTED_SUPER_ADMIN_EMAIL } from "../constants"

interface UseUserColumnsOptions {
  rolesOptions: Array<{ label: string; value: string }>
  canManage: boolean
  togglingUsers: Set<string>
  onToggleStatus: (row: UserRow, newStatus: boolean) => void
  showFeedback: (variant: "error" | "success", title: string, description?: string) => void
}

export function useUserColumns({
  rolesOptions,
  canManage,
  togglingUsers,
  onToggleStatus,
  showFeedback,
}: UseUserColumnsOptions) {
  const emailFilter = useDynamicFilterOptions({
    optionsEndpoint: apiRoutes.users.options({ column: "email" }),
  })

  const nameFilter = useDynamicFilterOptions({
    optionsEndpoint: apiRoutes.users.options({ column: "name" }),
  })

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
        filter: {
          type: "select",
          placeholder: "Chọn email...",
          searchPlaceholder: "Tìm kiếm...",
          emptyMessage: "Không tìm thấy.",
          options: emailFilter.options,
          onSearchChange: emailFilter.onSearchChange,
          isLoading: emailFilter.isLoading,
        },
        className: "min-w-[200px] max-w-[300px]",
        headerClassName: "min-w-[200px] max-w-[300px]",
      },
      {
        accessorKey: "name",
        header: "Tên",
        filter: {
          type: "select",
          placeholder: "Chọn tên...",
          searchPlaceholder: "Tìm kiếm...",
          emptyMessage: "Không tìm thấy.",
          options: nameFilter.options,
          onSearchChange: nameFilter.onSearchChange,
          isLoading: nameFilter.isLoading,
        },
        className: "min-w-[150px] max-w-[250px]",
        headerClassName: "min-w-[150px] max-w-[250px]",
        cell: (row) => row.name ?? "-",
      },
      {
        accessorKey: "roles",
        header: "Vai trò",
        filter: {
          type: "select",
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
        cell: (row) => {
          const isSuperAdmin = row.email === PROTECTED_SUPER_ADMIN_EMAIL
          // Disable switch nếu là super admin và đang ở trạng thái active (không cho toggle OFF)
          const isDisabled = togglingUsers.has(row.id) || !canManage || (isSuperAdmin && row.isActive)

          return row.deletedAt ? (
            <span className="inline-flex min-w-[88px] items-center justify-center rounded-full bg-rose-100 px-2 py-1 text-xs font-medium text-rose-700">
              Đã xóa
            </span>
          ) : (
            <div className="flex items-center gap-2">
              <Switch
                checked={row.isActive}
                disabled={isDisabled}
                onCheckedChange={(checked) => {
                  // Chặn toggle OFF cho super admin
                  if (isSuperAdmin && checked === false) {
                    showFeedback("error", USER_MESSAGES.CANNOT_DEACTIVATE_SUPER_ADMIN, USER_MESSAGES.CANNOT_DEACTIVATE_SUPER_ADMIN)
                    return
                  }
                  onToggleStatus(row, checked)
                }}
                aria-label={row.isActive ? "Vô hiệu hóa người dùng" : "Kích hoạt người dùng"}
                title={isSuperAdmin && row.isActive ? "Không thể vô hiệu hóa tài khoản super admin" : undefined}
              />
              <span className="text-xs text-muted-foreground">
                {row.isActive ? "Hoạt động" : "Tạm khóa"}
                {isSuperAdmin && (
                  <span className="ml-1 text-xs text-muted-foreground">(Super Admin)</span>
                )}
              </span>
            </div>
          )
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
      rolesOptions,
      emailFilter.options,
      emailFilter.onSearchChange,
      emailFilter.isLoading,
      nameFilter.options,
      nameFilter.onSearchChange,
      nameFilter.isLoading,
      togglingUsers,
      canManage,
      onToggleStatus,
      showFeedback,
    ],
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

  return {
    baseColumns,
    deletedColumns,
  }
}

