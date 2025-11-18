"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useResourceRouter } from "@/hooks/use-resource-segment"
import { RotateCcw, Trash2, MoreHorizontal, AlertTriangle, Eye, Pencil, Check, X } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"

import { ConfirmDialog } from "@/components/dialogs"
import type { DataTableColumn, DataTableQueryState, DataTableResult } from "@/components/tables"
import { FeedbackDialog, type FeedbackVariant } from "@/components/dialogs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import { queryKeys } from "@/lib/query-keys"
import { useContactRequestsSocketBridge } from "../hooks/use-contact-requests-socket-bridge"
import { logger } from "@/lib/config"

import type { ContactRequestRow, ContactRequestsResponse, ContactRequestsTableClientProps } from "../types"
import type { AdminContactRequestsListParams } from "@/lib/query-keys"

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
  row?: ContactRequestRow
  bulkIds?: string[]
  onConfirm: () => Promise<void>
}

const statusLabels: Record<string, string> = {
  NEW: "Mới",
  IN_PROGRESS: "Đang xử lý",
  RESOLVED: "Đã xử lý",
  CLOSED: "Đã đóng",
}

const priorityLabels: Record<string, string> = {
  LOW: "Thấp",
  MEDIUM: "Trung bình",
  HIGH: "Cao",
  URGENT: "Khẩn cấp",
}

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  NEW: "default",
  IN_PROGRESS: "secondary",
  RESOLVED: "outline",
  CLOSED: "destructive",
}

const priorityColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  LOW: "outline",
  MEDIUM: "default",
  HIGH: "secondary",
  URGENT: "destructive",
}

export function ContactRequestsTableClient({
  canDelete = false,
  canRestore = false,
  canManage = false,
  canUpdate = false,
  canAssign: _canAssign = false,
  initialData,
  initialUsersOptions = [],
}: ContactRequestsTableClientProps) {
  const router = useResourceRouter()
  const queryClient = useQueryClient()
  const { cacheVersion } = useContactRequestsSocketBridge()
  const [isBulkProcessing, setIsBulkProcessing] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackState | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState | null>(null)
  const [togglingRequests, setTogglingRequests] = useState<Set<string>>(new Set())
  const tableRefreshRef = useRef<(() => void) | null>(null)
  const tableSoftRefreshRef = useRef<(() => void) | null>(null)
  const pendingRealtimeRefreshRef = useRef(false)

  type RowActionConfig = {
    label: string
    icon: LucideIcon
    onSelect: () => void
    destructive?: boolean
    disabled?: boolean
  }

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

  // Handler để toggle read status
  const handleToggleRead = useCallback(
    async (row: ContactRequestRow, newStatus: boolean, refresh: () => void) => {
      if (!canUpdate) {
        showFeedback("error", "Không có quyền", "Bạn không có quyền thay đổi trạng thái đọc của yêu cầu liên hệ")
        return
      }

      setTogglingRequests((prev) => new Set(prev).add(row.id))

      try {
        await apiClient.put(apiRoutes.contactRequests.update(row.id), { isRead: newStatus })
        showFeedback(
          "success",
          newStatus ? "Đã đánh dấu đã đọc" : "Đã đánh dấu chưa đọc",
          newStatus 
            ? `Yêu cầu liên hệ "${row.subject}" đã được đánh dấu là đã đọc.`
            : `Yêu cầu liên hệ "${row.subject}" đã được đánh dấu là chưa đọc.`
        )
        refresh()
      } catch (error: unknown) {
        const errorMessage = 
          (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          (newStatus ? "Không thể đánh dấu đã đọc yêu cầu liên hệ." : "Không thể đánh dấu chưa đọc yêu cầu liên hệ.")
        showFeedback("error", newStatus ? "Đánh dấu đã đọc thất bại" : "Đánh dấu chưa đọc thất bại", errorMessage)
      } finally {
        setTogglingRequests((prev) => {
          const next = new Set(prev)
          next.delete(row.id)
          return next
        })
      }
    },
    [canUpdate, showFeedback],
  )

  const baseColumns = useMemo<DataTableColumn<ContactRequestRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Tên người liên hệ",
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
        className: "min-w-[180px] max-w-[250px]",
        headerClassName: "min-w-[180px] max-w-[250px]",
      },
      {
        accessorKey: "phone",
        header: "Số điện thoại",
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
        header: "Tiêu đề",
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
        header: "Trạng thái",
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
          <Badge variant={statusColors[row.status] || "default"}>{statusLabels[row.status] || row.status}</Badge>
        ),
      },
      {
        accessorKey: "priority",
        header: "Độ ưu tiên",
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
          <Badge variant={priorityColors[row.priority] || "default"}>{priorityLabels[row.priority] || row.priority}</Badge>
        ),
      },
      {
        accessorKey: "isRead",
        header: "Đã đọc",
        filter: {
          type: "select",
          placeholder: "Chọn trạng thái đọc...",
          options: [
            { label: "Đã đọc", value: "true" },
            { label: "Chưa đọc", value: "false" },
          ],
        },
        className: "min-w-[140px] max-w-[180px]",
        headerClassName: "min-w-[140px] max-w-[180px]",
        cell: (row) => (
          <div className="flex items-center gap-2">
            <Switch
              checked={row.isRead}
              disabled={togglingRequests.has(row.id) || !canUpdate}
              onCheckedChange={(checked) => {
                if (tableRefreshRef.current) {
                  handleToggleRead(row, checked, tableRefreshRef.current)
                }
              }}
              aria-label={row.isRead ? "Đánh dấu chưa đọc" : "Đánh dấu đã đọc"}
            />
            <span className="text-xs text-muted-foreground">
              {row.isRead ? "Đã đọc" : "Chưa đọc"}
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
      emailFilter.options,
      emailFilter.onSearchChange,
      emailFilter.isLoading,
      phoneFilter.options,
      phoneFilter.onSearchChange,
      phoneFilter.isLoading,
      subjectFilter.options,
      subjectFilter.onSearchChange,
      subjectFilter.isLoading,
      initialUsersOptions,
      togglingRequests,
      canUpdate,
      handleToggleRead,
    ],
  )

  const deletedColumns = useMemo<DataTableColumn<ContactRequestRow>[]>(
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

  // Handle realtime updates từ socket bridge
  useEffect(() => {
    if (cacheVersion === 0) return
    if (tableSoftRefreshRef.current) {
      tableSoftRefreshRef.current()
      pendingRealtimeRefreshRef.current = false
    } else {
      pendingRealtimeRefreshRef.current = true
    }
  }, [cacheVersion])

  // Set initialData vào React Query cache để socket bridge có thể cập nhật
  useEffect(() => {
    if (!initialData) return
    
    // Set initial data với params từ initialData
    const params: AdminContactRequestsListParams = {
      status: "active",
      page: initialData.page,
      limit: initialData.limit,
      search: undefined,
      filters: undefined,
    }
    const queryKey = queryKeys.adminContactRequests.list(params)
    queryClient.setQueryData(queryKey, initialData)
    
    logger.debug("Set initial data to cache", {
      queryKey: queryKey.slice(0, 2),
      rowsCount: initialData.rows.length,
      total: initialData.total,
    })
  }, [initialData, queryClient])

  const loader = useCallback(
    async (query: DataTableQueryState, view: ResourceViewMode<ContactRequestRow>) => {
      const baseUrl = apiRoutes.contactRequests.list({
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

      const response = await apiClient.get<ContactRequestsResponse>(url)
      const payload = response.data

      // Set vào cache với params tương ứng
      const viewStatus = (view.status ?? "active") as "active" | "deleted" | "all"
      const params: AdminContactRequestsListParams = {
        status: viewStatus,
        page: query.page,
        limit: query.limit,
        search: query.search.trim() || undefined,
        filters: Object.keys(query.filters).length > 0 ? query.filters : undefined,
      }
      const queryKey = queryKeys.adminContactRequests.list(params)
      const result: DataTableResult<ContactRequestRow> = {
        rows: payload.data,
        page: payload.pagination.page,
        limit: payload.pagination.limit,
        total: payload.pagination.total,
        totalPages: payload.pagination.totalPages,
      }
      queryClient.setQueryData(queryKey, result)

      return result
    },
    [queryClient],
  )

  const handleDeleteSingle = useCallback(
    (row: ContactRequestRow, refresh: () => void) => {
      if (!canDelete) return
      setDeleteConfirm({
        open: true,
        type: "soft",
        row,
        onConfirm: async () => {
          try {
            await apiClient.delete(apiRoutes.contactRequests.delete(row.id))
            showFeedback("success", "Xóa thành công", `Đã xóa yêu cầu liên hệ ${row.subject}`)
            refresh()
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định"
            showFeedback("error", "Xóa thất bại", `Không thể xóa yêu cầu liên hệ ${row.subject}`, errorMessage)
            throw error
          }
        },
      })
    },
    [canDelete, showFeedback],
  )

  const handleHardDeleteSingle = useCallback(
    (row: ContactRequestRow, refresh: () => void) => {
      if (!canManage) return
      setDeleteConfirm({
        open: true,
        type: "hard",
        row,
        onConfirm: async () => {
          try {
            await apiClient.delete(apiRoutes.contactRequests.hardDelete(row.id))
            showFeedback("success", "Xóa vĩnh viễn thành công", `Đã xóa vĩnh viễn yêu cầu liên hệ ${row.subject}`)
            refresh()
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định"
            showFeedback("error", "Xóa vĩnh viễn thất bại", `Không thể xóa vĩnh viễn yêu cầu liên hệ ${row.subject}`, errorMessage)
            throw error
          }
        },
      })
    },
    [canManage, showFeedback],
  )

  const handleRestoreSingle = useCallback(
    async (row: ContactRequestRow, refresh: () => void) => {
      if (!canRestore) return

      try {
        await apiClient.post(apiRoutes.contactRequests.restore(row.id))
        showFeedback("success", "Khôi phục thành công", `Đã khôi phục yêu cầu liên hệ "${row.subject}"`)
        refresh()
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định"
        showFeedback("error", "Khôi phục thất bại", `Không thể khôi phục yêu cầu liên hệ "${row.subject}"`, errorMessage)
        console.error("Failed to restore contact request", error)
      }
    },
    [canRestore, showFeedback],
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
              await apiClient.post(apiRoutes.contactRequests.bulk, { action, ids })
              showFeedback("success", "Xóa thành công", `Đã xóa ${ids.length} yêu cầu liên hệ`)
              clearSelection()
              refresh()
            } catch (error: unknown) {
              const errorMessage = error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định"
              showFeedback("error", "Xóa hàng loạt thất bại", `Không thể xóa ${ids.length} yêu cầu liên hệ`, errorMessage)
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
              await apiClient.post(apiRoutes.contactRequests.bulk, { action, ids })
              showFeedback("success", "Xóa vĩnh viễn thành công", `Đã xóa vĩnh viễn ${ids.length} yêu cầu liên hệ`)
              clearSelection()
              refresh()
            } catch (error: unknown) {
              const errorMessage = error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định"
              showFeedback("error", "Xóa vĩnh viễn thất bại", `Không thể xóa vĩnh viễn ${ids.length} yêu cầu liên hệ`, errorMessage)
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
            await apiClient.post(apiRoutes.contactRequests.bulk, { action, ids })
            showFeedback("success", "Khôi phục thành công", `Đã khôi phục ${ids.length} yêu cầu liên hệ`)
            clearSelection()
            refresh()
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định"
            showFeedback("error", "Khôi phục thất bại", `Không thể khôi phục ${ids.length} yêu cầu liên hệ`, errorMessage)
          } finally {
            setIsBulkProcessing(false)
          }
        })()
      }
    },
    [showFeedback],
  )

  const renderRowActions = useCallback(
    (actions: RowActionConfig[]) => {
      if (actions.length === 0) {
        return null
      }

      if (actions.length === 1) {
        const singleAction = actions[0]
        const Icon = singleAction.icon
        return (
          <Button
            variant="ghost"
            size="sm"
            disabled={singleAction.disabled}
            onClick={() => {
              if (singleAction.disabled) return
              singleAction.onSelect()
            }}
          >
            <Icon className="mr-2 h-5 w-5" />
            {singleAction.label}
          </Button>
        )
      }

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {actions.map((action) => {
              const Icon = action.icon
              return (
                <DropdownMenuItem
                  key={action.label}
                  disabled={action.disabled}
                  onClick={() => {
                    if (action.disabled) return
                    action.onSelect()
                  }}
                  className={
                    action.destructive
                      ? "text-destructive focus:text-destructive disabled:opacity-50"
                      : "disabled:opacity-50"
                  }
                >
                  <Icon
                    className={
                      action.destructive ? "mr-2 h-5 w-5 text-destructive" : "mr-2 h-5 w-5"
                    }
                  />
                  {action.label}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
    [],
  )

  const renderActiveRowActions = useCallback(
    (row: ContactRequestRow, { refresh }: { refresh: () => void }) => {
      const actions: RowActionConfig[] = [
        {
          label: "Xem chi tiết",
          icon: Eye,
          onSelect: () => router.push(`/admin/contact-requests/${row.id}`),
        },
      ]

      if (canUpdate) {
        actions.push({
          label: "Chỉnh sửa",
          icon: Pencil,
          onSelect: () => router.push(`/admin/contact-requests/${row.id}/edit`),
        })
      }

      if (canUpdate) {
        if (row.isRead) {
          actions.push({
            label: "Đánh dấu chưa đọc",
            icon: X,
            onSelect: () => {
              if (tableRefreshRef.current) {
                handleToggleRead(row, false, tableRefreshRef.current)
              }
            },
          })
        } else {
          actions.push({
            label: "Đánh dấu đã đọc",
            icon: Check,
            onSelect: () => {
              if (tableRefreshRef.current) {
                handleToggleRead(row, true, tableRefreshRef.current)
              }
            },
          })
        }
      }

      if (canDelete) {
        actions.push({
          label: "Xóa",
          icon: Trash2,
          onSelect: () => handleDeleteSingle(row, refresh),
          destructive: true,
        })
      }

      if (canManage) {
        actions.push({
          label: "Xóa vĩnh viễn",
          icon: AlertTriangle,
          onSelect: () => handleHardDeleteSingle(row, refresh),
          destructive: true,
        })
      }

      return renderRowActions(actions)
    },
    [canDelete, canManage, canUpdate, handleDeleteSingle, handleHardDeleteSingle, handleToggleRead, renderRowActions, router],
  )

  const renderDeletedRowActions = useCallback(
    (row: ContactRequestRow, { refresh }: { refresh: () => void }) => {
      const actions: RowActionConfig[] = [
        {
          label: "Xem chi tiết",
          icon: Eye,
          onSelect: () => router.push(`/admin/contact-requests/${row.id}`),
        },
      ]

      if (canRestore) {
        actions.push({
          label: "Khôi phục",
          icon: RotateCcw,
          onSelect: () => handleRestoreSingle(row, refresh),
        })
      }

      if (canManage) {
        actions.push({
          label: "Xóa vĩnh viễn",
          icon: AlertTriangle,
          onSelect: () => handleHardDeleteSingle(row, refresh),
          destructive: true,
        })
      }

      return renderRowActions(actions)
    },
    [canManage, canRestore, handleHardDeleteSingle, handleRestoreSingle, renderRowActions, router],
  )

  const viewModes = useMemo<ResourceViewMode<ContactRequestRow>[]>(() => {
    const modes: ResourceViewMode<ContactRequestRow>[] = [
      {
        id: "new",
        label: "Mới",
        status: "NEW",
        selectionEnabled: canDelete || canUpdate,
        selectionActions: canDelete || canUpdate
          ? ({ selectedIds, clearSelection, refresh }) => (
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <span>
                  Đã chọn <strong>{selectedIds.length}</strong> yêu cầu liên hệ
                </span>
                <div className="flex items-center gap-2">
                  {canDelete && (
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={isBulkProcessing || selectedIds.length === 0}
                      onClick={() => executeBulk("delete", selectedIds, refresh, clearSelection)}
                    >
                      <Trash2 className="mr-2 h-5 w-5" />
                      Xóa đã chọn ({selectedIds.length})
                    </Button>
                  )}
                  {canManage && (
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={isBulkProcessing || selectedIds.length === 0}
                      onClick={() => executeBulk("hard-delete", selectedIds, refresh, clearSelection)}
                    >
                      <AlertTriangle className="mr-2 h-5 w-5" />
                      Xóa vĩnh viễn ({selectedIds.length})
                    </Button>
                  )}
                  <Button type="button" size="sm" variant="ghost" onClick={clearSelection}>
                    Bỏ chọn
                  </Button>
                </div>
              </div>
            )
          : undefined,
        rowActions: (row, { refresh }) => renderActiveRowActions(row, { refresh }),
        emptyMessage: "Không tìm thấy yêu cầu liên hệ mới nào",
      },
      {
        id: "active",
        label: "Tất cả (đang hoạt động)",
        status: "active",
        selectionEnabled: canDelete || canUpdate,
        selectionActions: canDelete || canUpdate
          ? ({ selectedIds, clearSelection, refresh }) => (
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <span>
                  Đã chọn <strong>{selectedIds.length}</strong> yêu cầu liên hệ
                </span>
                <div className="flex items-center gap-2">
                  {canDelete && (
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={isBulkProcessing || selectedIds.length === 0}
                      onClick={() => executeBulk("delete", selectedIds, refresh, clearSelection)}
                    >
                      <Trash2 className="mr-2 h-5 w-5" />
                      Xóa đã chọn ({selectedIds.length})
                    </Button>
                  )}
                  {canManage && (
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={isBulkProcessing || selectedIds.length === 0}
                      onClick={() => executeBulk("hard-delete", selectedIds, refresh, clearSelection)}
                    >
                      <AlertTriangle className="mr-2 h-5 w-5" />
                      Xóa vĩnh viễn ({selectedIds.length})
                    </Button>
                  )}
                  <Button type="button" size="sm" variant="ghost" onClick={clearSelection}>
                    Bỏ chọn
                  </Button>
                </div>
              </div>
            )
          : undefined,
        rowActions: (row, { refresh }) => renderActiveRowActions(row, { refresh }),
        emptyMessage: "Không tìm thấy yêu cầu liên hệ nào phù hợp",
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
                  Đã chọn <strong>{selectedIds.length}</strong> yêu cầu liên hệ (đã xóa)
                </span>
                <div className="flex items-center gap-2">
                  {canRestore && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isBulkProcessing || selectedIds.length === 0}
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
                      disabled={isBulkProcessing || selectedIds.length === 0}
                      onClick={() => executeBulk("hard-delete", selectedIds, refresh, clearSelection)}
                    >
                      <AlertTriangle className="mr-2 h-5 w-5" />
                      Xóa vĩnh viễn ({selectedIds.length})
                    </Button>
                  )}
                  <Button type="button" size="sm" variant="ghost" onClick={clearSelection}>
                    Bỏ chọn
                  </Button>
                </div>
              </div>
            )
          : undefined,
        rowActions: (row, { refresh }) => renderDeletedRowActions(row, { refresh }),
        emptyMessage: "Không tìm thấy yêu cầu liên hệ đã xóa nào",
      },
    ]

    return modes
  }, [
    canDelete,
    canRestore,
    canManage,
    canUpdate,
    deletedColumns,
    executeBulk,
    isBulkProcessing,
    renderActiveRowActions,
    renderDeletedRowActions,
  ])

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

  return (
    <>
      <ResourceTableClient<ContactRequestRow>
        title="Quản lý yêu cầu liên hệ"
        baseColumns={baseColumns}
        loader={loader}
        viewModes={viewModes}
        defaultViewId="new"
        initialDataByView={initialDataByView}
        fallbackRowCount={6}
        onRefreshReady={(refresh) => {
          const wrapped = () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.adminContactRequests.all(), refetchType: "none" })
            refresh()
          }
          tableSoftRefreshRef.current = refresh
          tableRefreshRef.current = wrapped

          if (pendingRealtimeRefreshRef.current) {
            pendingRealtimeRefreshRef.current = false
            refresh()
          }
        }}
      />

      <ConfirmDialog
        open={deleteConfirm?.open ?? false}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteConfirm(null)
          }
        }}
        title={
          deleteConfirm?.type === "hard"
            ? deleteConfirm.bulkIds
              ? `Xóa vĩnh viễn ${deleteConfirm.bulkIds.length} yêu cầu liên hệ?`
              : `Xóa vĩnh viễn yêu cầu liên hệ "${deleteConfirm?.row?.subject}"?`
            : deleteConfirm?.bulkIds
              ? `Xóa ${deleteConfirm.bulkIds.length} yêu cầu liên hệ?`
              : `Xóa yêu cầu liên hệ "${deleteConfirm?.row?.subject}"?`
        }
        description={
          deleteConfirm?.type === "hard"
            ? deleteConfirm.bulkIds
              ? `Hành động này sẽ xóa vĩnh viễn ${deleteConfirm.bulkIds.length} yêu cầu liên hệ khỏi hệ thống. Dữ liệu sẽ không thể khôi phục. Bạn có chắc chắn muốn tiếp tục?`
              : `Hành động này sẽ xóa vĩnh viễn yêu cầu liên hệ "${deleteConfirm?.row?.subject}" khỏi hệ thống. Dữ liệu sẽ không thể khôi phục. Bạn có chắc chắn muốn tiếp tục?`
            : deleteConfirm?.bulkIds
              ? `Bạn có chắc chắn muốn xóa ${deleteConfirm.bulkIds.length} yêu cầu liên hệ? Chúng sẽ được chuyển vào thùng rác và có thể khôi phục sau.`
              : `Bạn có chắc chắn muốn xóa yêu cầu liên hệ "${deleteConfirm?.row?.subject}"? Yêu cầu sẽ được chuyển vào thùng rác và có thể khôi phục sau.`
        }
        confirmLabel={deleteConfirm?.type === "hard" ? "Xóa vĩnh viễn" : "Xóa"}
        cancelLabel="Hủy"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        isLoading={isBulkProcessing}
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

