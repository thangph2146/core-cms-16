"use client"

import { useCallback, useMemo, useState } from "react"
import { Eye, EyeOff, Trash2, CheckCircle2 } from "lucide-react"
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
import { Badge } from "@/components/ui/badge"
import { ResourceTableClient } from "@/features/admin/resources/components/resource-table.client"
import type { ResourceViewMode, ResourceTableLoader } from "@/features/admin/resources/types"
import { apiClient } from "@/lib/api/axios"
import type { NotificationRow } from "../types"

interface NotificationsTableClientProps {
  canManage?: boolean
  initialData: DataTableResult<NotificationRow>
}

interface FeedbackState {
  open: boolean
  variant: FeedbackVariant
  title: string
  description?: string
  details?: string
}

interface DeleteConfirmState {
  open: boolean
  row?: NotificationRow
  bulkIds?: string[]
  onConfirm: () => Promise<void>
}

const NOTIFICATION_KINDS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  MESSAGE: { label: "Tin nhắn", variant: "default" },
  SYSTEM: { label: "Hệ thống", variant: "secondary" },
  ANNOUNCEMENT: { label: "Thông báo", variant: "outline" },
  ALERT: { label: "Cảnh báo", variant: "destructive" },
  WARNING: { label: "Cảnh báo", variant: "destructive" },
  SUCCESS: { label: "Thành công", variant: "default" },
  INFO: { label: "Thông tin", variant: "secondary" },
}

export function NotificationsTableClient({
  canManage = false,
  initialData,
}: NotificationsTableClientProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackState | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState | null>(null)

  const showFeedback = useCallback(
    (variant: FeedbackVariant, title: string, description?: string, details?: string) => {
      setFeedback({ open: true, variant, title, description, details })
    },
    []
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
    []
  )

  const loader: ResourceTableLoader<NotificationRow> = useCallback(
    async (query: DataTableQueryState, _view: ResourceViewMode<NotificationRow>) => {
      const params = new URLSearchParams({
        page: String(query.page),
        limit: String(query.limit),
      })

      if (query.search.trim().length > 0) {
        params.set("search", query.search.trim())
      }

      Object.entries(query.filters).forEach(([key, value]) => {
        if (value) {
          params.set(`filter[${key}]`, value)
        }
      })

      const response = await apiClient.get<{
        data: NotificationRow[]
        pagination: {
          page: number
          limit: number
          total: number
          totalPages: number
        }
      }>(`/admin/notifications?${params.toString()}`)

      return {
        rows: response.data.data,
        page: response.data.pagination.page,
        limit: response.data.pagination.limit,
        total: response.data.pagination.total,
        totalPages: response.data.pagination.totalPages,
      }
    },
    []
  )

  const handleMarkAsRead = useCallback(
    async (row: NotificationRow) => {
      try {
        setIsProcessing(true)
        await apiClient.patch(`/notifications/${row.id}`, { isRead: true })
        showFeedback("success", "Đã đánh dấu đã đọc", "Thông báo đã được đánh dấu là đã đọc.")
        setTimeout(() => window.location.reload(), 1000)
      } catch {
        showFeedback("error", "Lỗi", "Không thể đánh dấu đã đọc thông báo.")
      } finally {
        setIsProcessing(false)
      }
    },
    [showFeedback]
  )

  const handleMarkAsUnread = useCallback(
    async (row: NotificationRow) => {
      try {
        setIsProcessing(true)
        await apiClient.patch(`/notifications/${row.id}`, { isRead: false })
        showFeedback("success", "Đã đánh dấu chưa đọc", "Thông báo đã được đánh dấu là chưa đọc.")
        setTimeout(() => window.location.reload(), 1000)
      } catch {
        showFeedback("error", "Lỗi", "Không thể đánh dấu chưa đọc thông báo.")
      } finally {
        setIsProcessing(false)
      }
    },
    [showFeedback]
  )

  const handleDelete = useCallback(
    async (row: NotificationRow) => {
      try {
        setIsProcessing(true)
        await apiClient.delete(`/notifications/${row.id}`)
        showFeedback("success", "Đã xóa", "Thông báo đã được xóa thành công.")
        setTimeout(() => window.location.reload(), 1000)
      } catch {
        showFeedback("error", "Lỗi", "Không thể xóa thông báo.")
      } finally {
        setIsProcessing(false)
      }
    },
    [showFeedback]
  )

  const handleBulkMarkAsRead = useCallback(
    async (ids: string[]) => {
      try {
        setIsProcessing(true)
        await Promise.all(ids.map((id) => apiClient.patch(`/notifications/${id}`, { isRead: true })))
        showFeedback("success", "Đã đánh dấu đã đọc", `Đã đánh dấu ${ids.length} thông báo là đã đọc.`)
        setTimeout(() => window.location.reload(), 1000)
      } catch {
        showFeedback("error", "Lỗi", "Không thể đánh dấu đã đọc các thông báo.")
      } finally {
        setIsProcessing(false)
      }
    },
    [showFeedback]
  )

  const handleBulkDelete = useCallback(
    async (ids: string[]) => {
      try {
        setIsProcessing(true)
        await Promise.all(ids.map((id) => apiClient.delete(`/notifications/${id}`)))
        showFeedback("success", "Đã xóa", `Đã xóa ${ids.length} thông báo thành công.`)
        setTimeout(() => window.location.reload(), 1000)
      } catch {
        showFeedback("error", "Lỗi", "Không thể xóa các thông báo.")
      } finally {
        setIsProcessing(false)
      }
    },
    [showFeedback]
  )

  const baseColumns = useMemo<DataTableColumn<NotificationRow>[]>(
    () => [
      {
        accessorKey: "userEmail",
        header: "Người dùng",
        filter: { placeholder: "Lọc email..." },
        searchable: true,
        className: "min-w-[200px]",
        headerClassName: "min-w-[200px]",
        cell: (row) => (
          <div>
            <div className="font-medium">{row.userEmail || "-"}</div>
            {row.userName && <div className="text-sm text-muted-foreground">{row.userName}</div>}
          </div>
        ),
      },
      {
        accessorKey: "kind",
        header: "Loại",
        filter: {
          type: "command",
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
        searchable: true,
        className: "min-w-[250px]",
        headerClassName: "min-w-[250px]",
      },
      {
        accessorKey: "description",
        header: "Mô tả",
        searchable: true,
        className: "min-w-[300px]",
        headerClassName: "min-w-[300px]",
        cell: (row) => row.description || "-",
      },
      {
        accessorKey: "isRead",
        header: "Trạng thái",
        filter: {
          type: "command",
          placeholder: "Chọn trạng thái...",
          options: [
            { label: "Đã đọc", value: "true" },
            { label: "Chưa đọc", value: "false" },
          ],
        },
        className: "min-w-[100px]",
        headerClassName: "min-w-[100px]",
        cell: (row) => (
          <Badge variant={row.isRead ? "secondary" : "default"}>
            {row.isRead ? "Đã đọc" : "Chưa đọc"}
          </Badge>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Ngày tạo",
        className: "min-w-[150px]",
        headerClassName: "min-w-[150px]",
        cell: (row) => dateFormatter.format(new Date(row.createdAt)),
      },
    ],
    [dateFormatter]
  )

  const viewModes: ResourceViewMode<NotificationRow>[] = [
    {
      id: "all",
      label: "Tất cả",
      columns: baseColumns,
      selectionEnabled: canManage,
      selectionActions: canManage
        ? ({ selectedIds, clearSelection }) => (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkMarkAsRead(selectedIds)}
                disabled={isProcessing}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Đánh dấu đã đọc ({selectedIds.length})
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  setDeleteConfirm({
                    open: true,
                    bulkIds: selectedIds,
                    onConfirm: async () => {
                      await handleBulkDelete(selectedIds)
                      clearSelection()
                      setDeleteConfirm(null)
                    },
                  })
                }}
                disabled={isProcessing}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Xóa ({selectedIds.length})
              </Button>
            </div>
          )
        : undefined,
      rowActions: canManage
        ? (row) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <span className="sr-only">Mở menu</span>
                  <span>⋮</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {row.isRead ? (
                  <DropdownMenuItem onClick={() => handleMarkAsUnread(row)}>
                    <EyeOff className="mr-2 h-4 w-4" />
                    Đánh dấu chưa đọc
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => handleMarkAsRead(row)}>
                    <Eye className="mr-2 h-4 w-4" />
                    Đánh dấu đã đọc
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => {
                    setDeleteConfirm({
                      open: true,
                      row,
                      onConfirm: async () => {
                        await handleDelete(row)
                        setDeleteConfirm(null)
                      },
                    })
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Xóa
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        : undefined,
    },
  ]

  const initialDataByView = {
    all: initialData,
  }

  return (
    <>
      <ResourceTableClient
        title="Quản lý thông báo"
        baseColumns={baseColumns}
        loader={loader}
        viewModes={viewModes}
        defaultViewId="all"
        initialDataByView={initialDataByView}
        fallbackRowCount={6}
      />

      {deleteConfirm && (
        <ConfirmDialog
          open={deleteConfirm.open}
          onOpenChange={(open) => {
            if (!open) setDeleteConfirm(null)
          }}
          title={deleteConfirm.bulkIds ? "Xóa thông báo" : "Xóa thông báo"}
          description={
            deleteConfirm.bulkIds
              ? `Bạn có chắc chắn muốn xóa ${deleteConfirm.bulkIds.length} thông báo đã chọn?`
              : "Bạn có chắc chắn muốn xóa thông báo này?"
          }
          variant="destructive"
          confirmLabel="Xóa"
          cancelLabel="Hủy"
          onConfirm={deleteConfirm.onConfirm}
          isLoading={isProcessing}
        />
      )}

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

