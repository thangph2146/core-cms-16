"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import { useResourceRouter } from "@/hooks/use-resource-segment"
import { RotateCcw, Trash2, MoreHorizontal, AlertTriangle, Eye, Plus, Pencil } from "lucide-react"
import type { LucideIcon } from "lucide-react"

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

import type { SessionRow, SessionsResponse, SessionsTableClientProps } from "../types"

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
  row?: SessionRow
  bulkIds?: string[]
  onConfirm: () => Promise<void>
}

export function SessionsTableClient({
  canDelete = false,
  canRestore = false,
  canManage = false,
  canCreate = false,
  initialData,
  initialUsersOptions: _initialUsersOptions = [],
}: SessionsTableClientProps) {
  const router = useResourceRouter()
  const [isBulkProcessing, setIsBulkProcessing] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackState | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState | null>(null)
  const [togglingSessions, setTogglingSessions] = useState<Set<string>>(new Set())
  const tableRefreshRef = useRef<(() => void) | null>(null)

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

  // Handler để toggle session status
  const handleToggleStatus = useCallback(
    async (row: SessionRow, newStatus: boolean, refresh: () => void) => {
      if (!canManage) {
        showFeedback("error", "Không có quyền", "Bạn không có quyền thay đổi trạng thái session")
        return
      }

      setTogglingSessions((prev) => new Set(prev).add(row.id))

      try {
        await apiClient.put(apiRoutes.sessions.update(row.id), {
          isActive: newStatus,
        })

        showFeedback(
          "success",
          "Cập nhật thành công",
          `Đã ${newStatus ? "kích hoạt" : "vô hiệu hóa"} session`
        )
        refresh()
      } catch (error) {
        console.error("Error toggling session status:", error)
        showFeedback(
          "error",
          "Lỗi cập nhật",
          `Không thể ${newStatus ? "kích hoạt" : "vô hiệu hóa"} session. Vui lòng thử lại.`
        )
      } finally {
        setTogglingSessions((prev) => {
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

  const userAgentFilter = useDynamicFilterOptions({
    optionsEndpoint: apiRoutes.sessions.options({ column: "userAgent" }),
  })

  const ipAddressFilter = useDynamicFilterOptions({
    optionsEndpoint: apiRoutes.sessions.options({ column: "ipAddress" }),
  })

  const baseColumns = useMemo<DataTableColumn<SessionRow>[]>(
    () => [
      {
        accessorKey: "userName",
        header: "Người dùng",
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
        header: "IP Address",
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
        header: "User Agent",
        filter: {
          type: "select",
          placeholder: "Chọn user agent...",
          searchPlaceholder: "Tìm kiếm...",
          emptyMessage: "Không tìm thấy.",
          options: userAgentFilter.options,
          onSearchChange: userAgentFilter.onSearchChange,
          isLoading: userAgentFilter.isLoading,
        },
        className: "min-w-[200px] max-w-[300px]",
        headerClassName: "min-w-[200px] max-w-[300px]",
        cell: (row) => (
          <span className="truncate text-sm" title={row.userAgent || undefined}>
            {row.userAgent ?? <span className="text-muted-foreground">-</span>}
          </span>
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
        cell: (row) => (
          <div className="flex items-center gap-2">
            <Switch
              checked={row.isActive}
              disabled={togglingSessions.has(row.id) || !canManage}
              onCheckedChange={(checked) => {
                if (tableRefreshRef.current) {
                  handleToggleStatus(row, checked, tableRefreshRef.current)
                }
              }}
              aria-label={row.isActive ? "Vô hiệu hóa session" : "Kích hoạt session"}
            />
            <span className="text-xs text-muted-foreground">
              {row.isActive ? "Hoạt động" : "Tạm khóa"}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "expiresAt",
        header: "Hết hạn",
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
    [dateFormatter, userAgentFilter.options, userAgentFilter.onSearchChange, userAgentFilter.isLoading, ipAddressFilter.options, ipAddressFilter.onSearchChange, ipAddressFilter.isLoading, togglingSessions, canManage, handleToggleStatus],
  )

  const loader = useCallback(
    async (query: DataTableQueryState, view: ResourceViewMode<SessionRow>) => {
      const baseUrl = apiRoutes.sessions.list({
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

      const response = await apiClient.get<SessionsResponse>(url)
      const payload = response.data

      return {
        rows: payload.data,
        page: payload.pagination.page,
        limit: payload.pagination.limit,
        total: payload.pagination.total,
        totalPages: payload.pagination.totalPages,
      } satisfies DataTableResult<SessionRow>
    },
    [],
  )

  const handleDeleteSingle = useCallback(
    (row: SessionRow, refresh: () => void) => {
      if (!canDelete) return
      setDeleteConfirm({
        open: true,
        type: "soft",
        row,
        onConfirm: async () => {
          try {
            await apiClient.delete(apiRoutes.sessions.delete(row.id))
            showFeedback("success", "Xóa thành công", `Đã xóa session`)
            refresh()
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định"
            showFeedback("error", "Xóa thất bại", `Không thể xóa session`, errorMessage)
            throw error
          }
        },
      })
    },
    [canDelete, showFeedback],
  )

  const handleHardDeleteSingle = useCallback(
    (row: SessionRow, refresh: () => void) => {
      if (!canManage) return
      setDeleteConfirm({
        open: true,
        type: "hard",
        row,
        onConfirm: async () => {
          try {
            await apiClient.delete(apiRoutes.sessions.hardDelete(row.id))
            showFeedback("success", "Xóa vĩnh viễn thành công", `Đã xóa vĩnh viễn session`)
            refresh()
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định"
            showFeedback("error", "Xóa vĩnh viễn thất bại", `Không thể xóa vĩnh viễn session`, errorMessage)
            throw error
          }
        },
      })
    },
    [canManage, showFeedback],
  )

  const handleRestoreSingle = useCallback(
    async (row: SessionRow, refresh: () => void) => {
      if (!canRestore) return

      try {
        await apiClient.post(apiRoutes.sessions.restore(row.id))
        showFeedback("success", "Khôi phục thành công", `Đã khôi phục session`)
        refresh()
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định"
        showFeedback("error", "Khôi phục thất bại", `Không thể khôi phục session`, errorMessage)
        console.error("Failed to restore session", error)
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
              await apiClient.post(apiRoutes.sessions.bulk, { action, ids })
              showFeedback("success", "Xóa thành công", `Đã xóa ${ids.length} session`)
              clearSelection()
              refresh()
            } catch (error: unknown) {
              const errorMessage = error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định"
              showFeedback("error", "Xóa hàng loạt thất bại", `Không thể xóa ${ids.length} session`, errorMessage)
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
              await apiClient.post(apiRoutes.sessions.bulk, { action, ids })
              showFeedback("success", "Xóa vĩnh viễn thành công", `Đã xóa vĩnh viễn ${ids.length} session`)
              clearSelection()
              refresh()
            } catch (error: unknown) {
              const errorMessage = error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định"
              showFeedback("error", "Xóa vĩnh viễn thất bại", `Không thể xóa vĩnh viễn ${ids.length} session`, errorMessage)
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
            await apiClient.post(apiRoutes.sessions.bulk, { action, ids })
            showFeedback("success", "Khôi phục thành công", `Đã khôi phục ${ids.length} session`)
            clearSelection()
            refresh()
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định"
            showFeedback("error", "Khôi phục thất bại", `Không thể khôi phục ${ids.length} session`, errorMessage)
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
    (row: SessionRow, { refresh }: { refresh: () => void }) => {
      const actions: RowActionConfig[] = [
        {
          label: "Xem chi tiết",
          icon: Eye,
          onSelect: () => router.push(`/admin/sessions/${row.id}`),
        },
      ]

      if (canManage) {
        actions.push({
          label: "Chỉnh sửa",
          icon: Pencil,
          onSelect: () => router.push(`/admin/sessions/${row.id}/edit`),
        })
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
    [canDelete, canManage, handleDeleteSingle, handleHardDeleteSingle, renderRowActions, router],
  )

  const renderDeletedRowActions = useCallback(
    (row: SessionRow, { refresh }: { refresh: () => void }) => {
      const actions: RowActionConfig[] = [
        {
          label: "Xem chi tiết",
          icon: Eye,
          onSelect: () => router.push(`/admin/sessions/${row.id}`),
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

  const viewModes = useMemo<ResourceViewMode<SessionRow>[]>(() => {
    const modes: ResourceViewMode<SessionRow>[] = [
      {
        id: "active",
        label: "Đang hoạt động",
        status: "active",
        selectionEnabled: canDelete,
        selectionActions: canDelete
          ? ({ selectedIds, clearSelection, refresh }) => (
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <span>
                  Đã chọn <strong>{selectedIds.length}</strong> session
                </span>
                <div className="flex items-center gap-2">
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
        emptyMessage: "Không tìm thấy session nào phù hợp",
      },
      {
        id: "deleted",
        label: "Đã xóa",
        status: "deleted",
        columns: baseColumns, // Session không có deletedAt, sử dụng isActive=false
        selectionEnabled: canRestore || canManage,
        selectionActions: canRestore || canManage
          ? ({ selectedIds, clearSelection, refresh }) => (
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <span>
                  Đã chọn <strong>{selectedIds.length}</strong> session (đã xóa)
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
        emptyMessage: "Không tìm thấy session đã xóa nào",
      },
    ]

    return modes
  }, [
    canDelete,
    canRestore,
    canManage,
    baseColumns,
    executeBulk,
    isBulkProcessing,
    renderActiveRowActions,
    renderDeletedRowActions,
  ])

  const initialDataByView = useMemo(
    () => (initialData ? { active: initialData } : undefined),
    [initialData],
  )

  const headerActions = canCreate ? (
    <Button
      type="button"
      size="sm"
      onClick={() => router.push("/admin/sessions/new")}
      className="h-8 px-3 text-xs sm:text-sm"
    >
      <Plus className="mr-2 h-5 w-5" />
      Thêm mới
    </Button>
  ) : undefined

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
      <ResourceTableClient<SessionRow>
        title="Quản lý session"
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
              ? `Xóa vĩnh viễn ${deleteConfirm.bulkIds.length} session?`
              : `Xóa vĩnh viễn session?`
            : deleteConfirm?.bulkIds
              ? `Xóa ${deleteConfirm.bulkIds.length} session?`
              : `Xóa session?`
        }
        description={
          deleteConfirm?.type === "hard"
            ? deleteConfirm.bulkIds
              ? `Hành động này sẽ xóa vĩnh viễn ${deleteConfirm.bulkIds.length} session khỏi hệ thống. Dữ liệu sẽ không thể khôi phục. Bạn có chắc chắn muốn tiếp tục?`
              : `Hành động này sẽ xóa vĩnh viễn session khỏi hệ thống. Dữ liệu sẽ không thể khôi phục. Bạn có chắc chắn muốn tiếp tục?`
            : deleteConfirm?.bulkIds
              ? `Bạn có chắc chắn muốn xóa ${deleteConfirm.bulkIds.length} session? Chúng sẽ được chuyển vào thùng rác và có thể khôi phục sau.`
              : `Bạn có chắc chắn muốn xóa session? Session sẽ được chuyển vào thùng rác và có thể khôi phục sau.`
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

