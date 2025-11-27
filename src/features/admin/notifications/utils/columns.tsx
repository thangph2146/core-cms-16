import { useMemo } from "react"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import type { DataTableColumn } from "@/components/tables"
import { useDynamicFilterOptions } from "@/features/admin/resources/hooks/use-dynamic-filter-options"
import { apiRoutes } from "@/lib/api/routes"
import type { NotificationRow } from "../types"
import { NOTIFICATION_KINDS, NOTIFICATION_LABELS } from "../constants"

interface UseNotificationColumnsOptions {
  togglingNotifications: Set<string>
  sessionUserId?: string
  onToggleRead: (row: NotificationRow, checked: boolean) => void
}

export function useNotificationColumns({
  togglingNotifications,
  sessionUserId,
  onToggleRead,
}: UseNotificationColumnsOptions) {
  const userEmailFilter = useDynamicFilterOptions({
    optionsEndpoint: apiRoutes.adminNotifications.options({ column: "userEmail" }),
  })

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [],
  )

  const baseColumns = useMemo<DataTableColumn<NotificationRow>[]>(
    () => [
      {
        accessorKey: "userEmail",
        header: "Người dùng",
        filter: {
          type: "select",
          placeholder: "Chọn email...",
          searchPlaceholder: "Tìm kiếm...",
          emptyMessage: "Không tìm thấy.",
          options: userEmailFilter.options,
          onSearchChange: userEmailFilter.onSearchChange,
          isLoading: userEmailFilter.isLoading,
        },
        className: "min-w-[200px]",
        headerClassName: "min-w-[200px]",
        cell: (row) => {
          const isOwner = sessionUserId === row.userId
          return (
            <div className="flex items-center gap-2">
              <div>
                <div className="font-medium">{row.userEmail || "-"}</div>
                {row.userName && <div className="text-sm text-muted-foreground">{row.userName}</div>}
                {isOwner && (
                  <Badge variant="outline" className="text-xs">
                    {NOTIFICATION_LABELS.OWN_NOTIFICATION}
                  </Badge>
                )}
              </div>
            </div>
          )
        },
      },
      {
        accessorKey: "kind",
        header: "Loại",
        filter: {
          type: "select",
          placeholder: "Chọn loại...",
          options: Object.entries(NOTIFICATION_KINDS).map(([value, { label }]) => ({
            label,
            value,
          })),
        },
        className: "min-w-[120px]",
        headerClassName: "min-w-[120px]",
        cell: (row) => {
          const kind = NOTIFICATION_KINDS[row.kind] || { label: row.kind, variant: "secondary" as const }
          return <Badge variant={kind.variant}>{kind.label}</Badge>
        },
      },
      {
        accessorKey: "title",
        header: "Tiêu đề",
        className: "min-w-[250px] max-w-[400px]",
        headerClassName: "min-w-[250px] max-w-[400px]",
        cell: (row) => (
          <a
            href={`/admin/notifications/${row.id}`}
            className="font-medium text-primary hover:underline break-words"
            title={row.title}
          >
            {row.title}
          </a>
        ),
      },
      {
        accessorKey: "description",
        header: "Mô tả",
        className: "min-w-[300px] max-w-[500px]",
        headerClassName: "min-w-[300px] max-w-[500px]",
        cell: (row) => (
          <div className="break-words max-w-[500px]" title={row.description || undefined}>
            {row.description || "-"}
          </div>
        ),
      },
      {
        accessorKey: "isRead",
        header: "Trạng thái",
        filter: {
          type: "select",
          placeholder: "Chọn trạng thái...",
          options: [
            { label: NOTIFICATION_LABELS.READ, value: "true" },
            { label: NOTIFICATION_LABELS.UNREAD, value: "false" },
          ],
        },
        className: "min-w-[140px] max-w-[180px]",
        headerClassName: "min-w-[140px] max-w-[180px]",
        cell: (row) => {
          const isOwner = sessionUserId === row.userId
          
          return (
            <div className="flex items-center gap-2">
              <Switch
                checked={row.isRead}
                disabled={togglingNotifications.has(row.id) || !isOwner}
                onCheckedChange={(checked) => {
                  if (isOwner) {
                    onToggleRead(row, checked)
                  }
                }}
                aria-label={row.isRead ? "Đánh dấu chưa đọc" : "Đánh dấu đã đọc"}
              />
              <span className="text-xs text-muted-foreground">
                {row.isRead ? NOTIFICATION_LABELS.READ : NOTIFICATION_LABELS.UNREAD}
              </span>
            </div>
          )
        },
      },
      {
        accessorKey: "createdAt",
        header: "Ngày tạo",
        className: "min-w-[150px]",
        headerClassName: "min-w-[150px]",
        cell: (row) => dateFormatter.format(new Date(row.createdAt)),
      },
    ],
    [
      dateFormatter,
      userEmailFilter.options,
      userEmailFilter.onSearchChange,
      userEmailFilter.isLoading,
      sessionUserId,
      togglingNotifications,
      onToggleRead,
    ],
  )

  return {
    baseColumns,
  }
}

