import { useMemo } from "react"
import { Switch } from "@/components/ui/switch"
import type { DataTableColumn } from "@/components/tables"
import { useDynamicFilterOptions } from "@/features/admin/resources/hooks/use-dynamic-filter-options"
import { apiRoutes } from "@/lib/api/routes"
import type { SessionRow } from "../types"
import { SESSION_LABELS } from "../constants"

interface UseSessionColumnsOptions {
  togglingSessions: Set<string>
  canManage: boolean
  onToggleStatus: (row: SessionRow, checked: boolean) => void
}

export function useSessionColumns({
  togglingSessions,
  canManage,
  onToggleStatus,
}: UseSessionColumnsOptions) {
  const userAgentFilter = useDynamicFilterOptions({
    optionsEndpoint: apiRoutes.sessions.options({ column: "userAgent" }),
  })

  const ipAddressFilter = useDynamicFilterOptions({
    optionsEndpoint: apiRoutes.sessions.options({ column: "ipAddress" }),
  })

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [],
  )

  const baseColumns = useMemo<DataTableColumn<SessionRow>[]>(
    () => [
      {
        accessorKey: "userName",
        header: SESSION_LABELS.USER,
        className: "min-w-[150px] max-w-[200px]",
        headerClassName: "min-w-[150px] max-w-[200px]",
        cell: (row) => (
          <div>
            <div className="font-medium">{row.userName || row.userEmail || "-"}</div>
            {row.userEmail && row.userName && (
              <div className="text-xs text-muted-foreground">{row.userEmail}</div>
            )}
          </div>
        ),
      },
      {
        accessorKey: "ipAddress",
        header: SESSION_LABELS.IP_ADDRESS,
        filter: {
          type: "select",
          placeholder: "Chọn IP address...",
          searchPlaceholder: "Tìm kiếm...",
          emptyMessage: "Không tìm thấy.",
          options: ipAddressFilter.options,
          onSearchChange: ipAddressFilter.onSearchChange,
          isLoading: ipAddressFilter.isLoading,
        },
        className: "min-w-[120px] max-w-[150px]",
        headerClassName: "min-w-[120px] max-w-[150px]",
        cell: (row) => row.ipAddress ?? <span className="text-muted-foreground">-</span>,
      },
      {
        accessorKey: "userAgent",
        header: SESSION_LABELS.USER_AGENT,
        filter: {
          type: "select",
          placeholder: "Chọn user agent...",
          searchPlaceholder: "Tìm kiếm...",
          emptyMessage: "Không tìm thấy.",
          options: userAgentFilter.options,
          onSearchChange: userAgentFilter.onSearchChange,
          isLoading: userAgentFilter.isLoading,
        },
        className: "min-w-[200px] max-w-[400px]",
        headerClassName: "min-w-[200px] max-w-[400px]",
        cell: (row) => (
          <div className="break-words max-w-[400px] text-sm" title={row.userAgent || undefined}>
            {row.userAgent ?? <span className="text-muted-foreground">-</span>}
          </div>
        ),
      },
      {
        accessorKey: "isActive",
        header: SESSION_LABELS.STATUS,
        filter: {
          type: "select",
          placeholder: "Chọn trạng thái...",
          searchPlaceholder: "Tìm kiếm...",
          emptyMessage: "Không tìm thấy.",
          options: [
            { label: SESSION_LABELS.ACTIVE, value: "true" },
            { label: SESSION_LABELS.INACTIVE, value: "false" },
          ],
        },
        className: "w-[120px]",
        headerClassName: "w-[120px]",
        cell: (row) => (
          <div className="flex items-center gap-2">
            <Switch
              checked={row.isActive}
              disabled={togglingSessions.has(row.id) || !canManage}
              onCheckedChange={(checked) => {
                onToggleStatus(row, checked)
              }}
              aria-label={row.isActive ? SESSION_LABELS.TOGGLE_INACTIVE : SESSION_LABELS.TOGGLE_ACTIVE}
            />
            <span className="text-xs text-muted-foreground">
              {row.isActive ? SESSION_LABELS.ACTIVE : SESSION_LABELS.INACTIVE}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "expiresAt",
        header: SESSION_LABELS.EXPIRES_AT,
        filter: {
          type: "date",
          placeholder: "Chọn ngày hết hạn",
          dateFormat: "dd/MM/yyyy",
        },
        className: "min-w-[140px] max-w-[180px]",
        headerClassName: "min-w-[140px] max-w-[180px]",
        cell: (row) => {
          try {
            return dateFormatter.format(new Date(row.expiresAt))
          } catch {
            return row.expiresAt
          }
        },
      },
      {
        accessorKey: "createdAt",
        header: SESSION_LABELS.CREATED_AT,
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
      userAgentFilter.options,
      userAgentFilter.onSearchChange,
      userAgentFilter.isLoading,
      ipAddressFilter.options,
      ipAddressFilter.onSearchChange,
      ipAddressFilter.isLoading,
      togglingSessions,
      canManage,
      onToggleStatus,
    ],
  )

  const deletedColumns = useMemo<DataTableColumn<SessionRow>[]>(
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
          if (!row.deletedAt) return <span className="text-muted-foreground">-</span>
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

