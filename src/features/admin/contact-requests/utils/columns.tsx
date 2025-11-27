import { useMemo } from "react"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import type { DataTableColumn } from "@/components/tables"
import { useDynamicFilterOptions } from "@/features/admin/resources/hooks/use-dynamic-filter-options"
import { apiRoutes } from "@/lib/api/routes"
import type { ContactRequestRow } from "../types"
import { CONTACT_REQUEST_LABELS } from "../constants"

interface UseContactRequestColumnsOptions {
  togglingRequests: Set<string>
  canUpdate: boolean
  initialUsersOptions?: Array<{ label: string; value: string }>
  onToggleRead: (row: ContactRequestRow, checked: boolean) => void
}

export function useContactRequestColumns({
  togglingRequests,
  canUpdate,
  initialUsersOptions = [],
  onToggleRead,
}: UseContactRequestColumnsOptions) {
  const nameFilter = useDynamicFilterOptions({
    optionsEndpoint: apiRoutes.contactRequests.options({ column: "name" }),
  })

  const emailFilter = useDynamicFilterOptions({
    optionsEndpoint: apiRoutes.contactRequests.options({ column: "email" }),
  })

  const phoneFilter = useDynamicFilterOptions({
    optionsEndpoint: apiRoutes.contactRequests.options({ column: "phone" }),
  })

  const subjectFilter = useDynamicFilterOptions({
    optionsEndpoint: apiRoutes.contactRequests.options({ column: "subject" }),
  })

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [],
  )

  const statusLabels = useMemo(
    () => ({
      NEW: CONTACT_REQUEST_LABELS.NEW,
      IN_PROGRESS: CONTACT_REQUEST_LABELS.IN_PROGRESS,
      RESOLVED: CONTACT_REQUEST_LABELS.RESOLVED,
      CLOSED: CONTACT_REQUEST_LABELS.CLOSED,
    }),
    [],
  )

  const priorityLabels = useMemo(
    () => ({
      LOW: CONTACT_REQUEST_LABELS.LOW,
      MEDIUM: CONTACT_REQUEST_LABELS.MEDIUM,
      HIGH: CONTACT_REQUEST_LABELS.HIGH,
      URGENT: CONTACT_REQUEST_LABELS.URGENT,
    }),
    [],
  )

  const statusColors = useMemo<Record<string, "default" | "secondary" | "destructive" | "outline">>(
    () => ({
      NEW: "default",
      IN_PROGRESS: "secondary",
      RESOLVED: "outline",
      CLOSED: "destructive",
    }),
    [],
  )

  const priorityColors = useMemo<Record<string, "default" | "secondary" | "destructive" | "outline">>(
    () => ({
      LOW: "outline",
      MEDIUM: "default",
      HIGH: "secondary",
      URGENT: "destructive",
    }),
    [],
  )

  const baseColumns = useMemo<DataTableColumn<ContactRequestRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: CONTACT_REQUEST_LABELS.NAME,
        filter: {
          type: "select",
          placeholder: "Chọn tên...",
          searchPlaceholder: "Tìm kiếm...",
          emptyMessage: "Không tìm thấy.",
          options: nameFilter.options,
          onSearchChange: nameFilter.onSearchChange,
          isLoading: nameFilter.isLoading,
        },
        className: "min-w-[150px] max-w-[200px]",
        headerClassName: "min-w-[150px] max-w-[200px]",
      },
      {
        accessorKey: "email",
        header: CONTACT_REQUEST_LABELS.EMAIL,
        filter: {
          type: "select",
          placeholder: "Chọn email...",
          searchPlaceholder: "Tìm kiếm...",
          emptyMessage: "Không tìm thấy.",
          options: emailFilter.options,
          onSearchChange: emailFilter.onSearchChange,
          isLoading: emailFilter.isLoading,
        },
        className: "min-w-[180px] max-w-[250px]",
        headerClassName: "min-w-[180px] max-w-[250px]",
      },
      {
        accessorKey: "phone",
        header: CONTACT_REQUEST_LABELS.PHONE,
        filter: {
          type: "select",
          placeholder: "Chọn số điện thoại...",
          searchPlaceholder: "Tìm kiếm...",
          emptyMessage: "Không tìm thấy.",
          options: phoneFilter.options,
          onSearchChange: phoneFilter.onSearchChange,
          isLoading: phoneFilter.isLoading,
        },
        className: "min-w-[120px] max-w-[150px]",
        headerClassName: "min-w-[120px] max-w-[150px]",
        cell: (row) => row.phone || <span className="text-muted-foreground">-</span>,
      },
      {
        accessorKey: "subject",
        header: CONTACT_REQUEST_LABELS.SUBJECT,
        filter: {
          type: "select",
          placeholder: "Chọn tiêu đề...",
          searchPlaceholder: "Tìm kiếm...",
          emptyMessage: "Không tìm thấy.",
          options: subjectFilter.options,
          onSearchChange: subjectFilter.onSearchChange,
          isLoading: subjectFilter.isLoading,
        },
        className: "min-w-[200px] max-w-[300px]",
        headerClassName: "min-w-[200px] max-w-[300px]",
      },
      {
        accessorKey: "status",
        header: CONTACT_REQUEST_LABELS.STATUS,
        filter: {
          type: "select",
          placeholder: "Chọn trạng thái...",
          searchPlaceholder: "Tìm kiếm trạng thái...",
          emptyMessage: "Không tìm thấy trạng thái.",
          options: Object.entries(statusLabels).map(([value, label]) => ({ label, value })),
        },
        className: "min-w-[120px] max-w-[150px]",
        headerClassName: "min-w-[120px] max-w-[150px]",
        cell: (row) => (
          <Badge variant={statusColors[row.status] || "default"}>
            {statusLabels[row.status] || row.status}
          </Badge>
        ),
      },
      {
        accessorKey: "priority",
        header: CONTACT_REQUEST_LABELS.PRIORITY,
        filter: {
          type: "select",
          placeholder: "Chọn độ ưu tiên...",
          searchPlaceholder: "Tìm kiếm độ ưu tiên...",
          emptyMessage: "Không tìm thấy độ ưu tiên.",
          options: Object.entries(priorityLabels).map(([value, label]) => ({ label, value })),
        },
        className: "min-w-[120px] max-w-[150px]",
        headerClassName: "min-w-[120px] max-w-[150px]",
        cell: (row) => (
          <Badge variant={priorityColors[row.priority] || "default"}>
            {priorityLabels[row.priority] || row.priority}
          </Badge>
        ),
      },
      {
        accessorKey: "isRead",
        header: CONTACT_REQUEST_LABELS.IS_READ,
        filter: {
          type: "select",
          placeholder: "Chọn trạng thái đọc...",
          options: [
            { label: CONTACT_REQUEST_LABELS.READ, value: "true" },
            { label: CONTACT_REQUEST_LABELS.UNREAD, value: "false" },
          ],
        },
        className: "min-w-[140px] max-w-[180px]",
        headerClassName: "min-w-[140px] max-w-[180px]",
        cell: (row) =>
          row.deletedAt ? (
            <span className="inline-flex min-w-[88px] items-center justify-center rounded-full bg-rose-100 px-2 py-1 text-xs font-medium text-rose-700">
              {CONTACT_REQUEST_LABELS.DELETED}
            </span>
          ) : (
            <div className="flex items-center gap-2">
              <Switch
                checked={row.isRead}
                disabled={togglingRequests.has(row.id) || !canUpdate}
                onCheckedChange={(checked) => onToggleRead(row, checked)}
                aria-label={row.isRead ? "Đánh dấu chưa đọc" : "Đánh dấu đã đọc"}
              />
              <span className="text-xs text-muted-foreground">
                {row.isRead ? CONTACT_REQUEST_LABELS.READ : CONTACT_REQUEST_LABELS.UNREAD}
              </span>
            </div>
          ),
      },
      {
        accessorKey: "assignedToName",
        header: "Người được giao",
        filter: {
          type: "select",
          placeholder: "Chọn người được giao...",
          searchPlaceholder: "Tìm kiếm người dùng...",
          emptyMessage: "Không tìm thấy người dùng.",
          options: initialUsersOptions,
        },
        className: "min-w-[150px] max-w-[200px]",
        headerClassName: "min-w-[150px] max-w-[200px]",
        cell: (row) => row.assignedToName || <span className="text-muted-foreground">-</span>,
      },
      {
        accessorKey: "createdAt",
        header: CONTACT_REQUEST_LABELS.CREATED_AT,
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
      emailFilter.options,
      emailFilter.onSearchChange,
      emailFilter.isLoading,
      phoneFilter.options,
      phoneFilter.onSearchChange,
      phoneFilter.isLoading,
      subjectFilter.options,
      subjectFilter.onSearchChange,
      subjectFilter.isLoading,
      statusLabels,
      priorityLabels,
      statusColors,
      priorityColors,
      initialUsersOptions,
      togglingRequests,
      canUpdate,
      onToggleRead,
    ],
  )

  const deletedColumns = useMemo<DataTableColumn<ContactRequestRow>[]>(
    () => [
      ...baseColumns,
      {
        accessorKey: "deletedAt",
        header: CONTACT_REQUEST_LABELS.DELETED_AT,
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

