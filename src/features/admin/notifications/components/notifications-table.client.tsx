"use client"

import { useCallback, useEffect, useMemo, useState, useRef } from "react"
import { Eye, EyeOff, Trash2, CheckCircle2, Loader2 } from "lucide-react"
import { useSession } from "next-auth/react"
import { useQueryClient, useQuery } from "@tanstack/react-query"
import { ConfirmDialog } from "@/components/dialogs"
import { queryKeys, invalidateQueries } from "@/lib/query-keys"
import { apiRoutes } from "@/lib/api/routes"
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
import { useDeleteAllNotifications, useAdminNotificationsSocketBridge } from "@/hooks/use-notifications"
import { logger } from "@/lib/config"
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
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const deleteAllNotifications = useDeleteAllNotifications()
  
  const [isProcessing, setIsProcessing] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackState | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState | null>(null)
  const [deleteAllConfirm, setDeleteAllConfirm] = useState(false)
  const tableRefreshRef = useRef<(() => void) | null>(null)

  // Function để trigger refresh của table
  // Sử dụng refresh function từ ResourceTableClient và invalidateQueries
  // Theo chuẩn Next.js 16: chỉ invalidate những queries thực sự cần thiết
  const triggerTableRefresh = useCallback(() => {
    logger.info("triggerTableRefresh called", {
      hasRefreshFn: !!tableRefreshRef.current,
    })
    
    // Invalidate admin notifications table
    invalidateQueries.adminNotifications(queryClient)
    logger.debug("Admin notifications queries invalidated")
    
    // Trigger DataTable refresh qua refreshKey
    if (tableRefreshRef.current) {
      logger.info("Calling table refresh function")
      tableRefreshRef.current()
    } else {
      logger.warn("Table refresh function not available yet")
    }
  }, [queryClient])

  // Sử dụng socket bridge để invalidate queries khi có socket events
  const { socket } = useAdminNotificationsSocketBridge()

  // Lắng nghe socket events trực tiếp và trigger table refresh
  useEffect(() => {
    if (!socket || !session?.user?.id) {
      return
    }

    const handleEvent = () => {
      logger.info("Direct socket event received - triggering table refresh", {
        userId: session.user.id,
      })
      triggerTableRefresh()
    }

    if (socket.connected) {
      logger.info("Setting up direct socket listeners for table refresh", {
        socketId: socket.id,
        connected: socket.connected,
      })

      socket.on("notification:new", handleEvent)
      socket.on("notification:admin", handleEvent)
      socket.on("notification:updated", handleEvent)
      socket.on("notifications:sync", handleEvent)
    } else {
      logger.debug("Socket not connected yet, waiting for connection")
      const onConnect = () => {
        logger.info("Socket connected, attaching direct listeners for table refresh", {
          socketId: socket.id,
        })
        socket.on("notification:new", handleEvent)
        socket.on("notification:admin", handleEvent)
        socket.on("notification:updated", handleEvent)
        socket.on("notifications:sync", handleEvent)
      }
      socket.once("connect", onConnect)
    }

    return () => {
      if (socket) {
        socket.off("notification:new", handleEvent)
        socket.off("notification:admin", handleEvent)
        socket.off("notification:updated", handleEvent)
        socket.off("notifications:sync", handleEvent)
      }
    }
  }, [socket, session?.user?.id, triggerTableRefresh])

  // Tạo một query trong cache để có thể subscribe vào invalidate events
  // Query này không fetch data (enabled: false), chỉ để có query trong cache
  // Khi admin notifications query bị invalidate, sẽ trigger refresh table
  useQuery({
    queryKey: queryKeys.notifications.admin(),
    queryFn: async () => {
      // Không fetch data, chỉ để có query trong cache
      return null
    },
    enabled: false, // Không tự động fetch
    staleTime: Infinity, // Không bao giờ stale
  })

  // Lắng nghe sự thay đổi của admin notifications query để tự động refresh table
  // Khi có socket events hoặc thao tác từ notification bell, query keys sẽ bị invalidate
  // và trigger refresh này để admin table cập nhật ngay lập tức
  useEffect(() => {
    // Subscribe vào query cache để detect khi admin notifications bị invalidate
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      // Check if this is an event for admin notifications query
      if (
        event &&
        event.query &&
        Array.isArray(event.query.queryKey) &&
        event.query.queryKey[0] === "notifications" &&
        event.query.queryKey[1] === "admin"
      ) {
        logger.info("Admin notifications query event detected - triggering table refresh", {
          eventType: event.type,
          queryKey: event.query.queryKey,
          hasRefreshFn: !!tableRefreshRef.current,
        })
        // Trigger table refresh ngay khi detect event (có thể là invalidate, updated, etc.)
        triggerTableRefresh()
      }
    })

    return () => {
      unsubscribe()
    }
  }, [queryClient, triggerTableRefresh])

  // Callback để nhận refresh function từ ResourceTableClient
  const handleRefreshReady = useCallback((refresh: () => void) => {
    tableRefreshRef.current = refresh
  }, [])

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
      // Sử dụng apiRoutes để tạo URL đúng
      const url = apiRoutes.adminNotifications.list({
        page: query.page,
        limit: query.limit,
        search: query.search.trim(),
      })

      // Không cần invalidate trong loader - loader sẽ được gọi khi refreshKey thay đổi

      const response = await apiClient.get<{
        data: NotificationRow[]
        pagination: {
          page: number
          limit: number
          total: number
          totalPages: number
        }
      }>(url)

      return {
        rows: response.data.data,
        page: response.data.pagination.page,
        limit: response.data.pagination.limit,
        total: response.data.pagination.total,
        totalPages: response.data.pagination.totalPages,
      }
    },
    [queryClient]
  )

  const handleMarkAsRead = useCallback(
    async (row: NotificationRow) => {
      try {
        setIsProcessing(true)
        await apiClient.patch(apiRoutes.notifications.markRead(row.id), { isRead: true })
        showFeedback("success", "Đã đánh dấu đã đọc", "Thông báo đã được đánh dấu là đã đọc.")
        triggerTableRefresh()
      } catch {
        showFeedback("error", "Lỗi", "Không thể đánh dấu đã đọc thông báo.")
      } finally {
        setIsProcessing(false)
      }
    },
    [showFeedback, triggerTableRefresh]
  )

  const handleMarkAsUnread = useCallback(
    async (row: NotificationRow) => {
      try {
        setIsProcessing(true)
        await apiClient.patch(apiRoutes.notifications.markRead(row.id), { isRead: false })
        showFeedback("success", "Đã đánh dấu chưa đọc", "Thông báo đã được đánh dấu là chưa đọc.")
        triggerTableRefresh()
      } catch {
        showFeedback("error", "Lỗi", "Không thể đánh dấu chưa đọc thông báo.")
      } finally {
        setIsProcessing(false)
      }
    },
    [showFeedback, triggerTableRefresh]
  )

  const handleDelete = useCallback(
    async (row: NotificationRow) => {
      try {
        setIsProcessing(true)
        await apiClient.delete(apiRoutes.notifications.delete(row.id))
        showFeedback("success", "Đã xóa", "Thông báo đã được xóa thành công.")
        triggerTableRefresh()
      } catch (error: unknown) {
        const errorMessage = 
          (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "Bạn chỉ có thể xóa thông báo của chính mình. Kể cả super admin cũng không được xóa thông báo của người khác."
        showFeedback("error", "Lỗi", errorMessage)
      } finally {
        setIsProcessing(false)
      }
    },
    [showFeedback, triggerTableRefresh]
  )

  const handleBulkMarkAsRead = useCallback(
    async (ids: string[]) => {
      try {
        setIsProcessing(true)
        await Promise.all(ids.map((id) => apiClient.patch(apiRoutes.notifications.markRead(id), { isRead: true })))
        showFeedback("success", "Đã đánh dấu đã đọc", `Đã đánh dấu ${ids.length} thông báo là đã đọc.`)
        triggerTableRefresh()
      } catch {
        showFeedback("error", "Lỗi", "Không thể đánh dấu đã đọc các thông báo.")
      } finally {
        setIsProcessing(false)
      }
    },
    [showFeedback, triggerTableRefresh]
  )

  const handleBulkDelete = useCallback(
    async (ids: string[]) => {
      try {
        setIsProcessing(true)
        // Chỉ xóa các notification mà user là chủ sở hữu
        // API sẽ reject những notification không thuộc về user
        const results = await Promise.allSettled(
          ids.map((id) => apiClient.delete(apiRoutes.notifications.delete(id)))
        )
        
        const successful = results.filter((r) => r.status === "fulfilled").length
        const failed = results.filter((r) => r.status === "rejected").length
        
        if (successful > 0) {
          showFeedback(
            "success",
            "Đã xóa",
            `Đã xóa ${successful} thông báo thành công.${failed > 0 ? ` ${failed} thông báo không thể xóa vì không phải chủ sở hữu.` : ""}`
          )
          triggerTableRefresh()
        } else {
          showFeedback(
            "error",
            "Lỗi",
            "Không thể xóa các thông báo. Bạn chỉ có thể xóa thông báo của chính mình."
          )
        }
      } catch {
        showFeedback("error", "Lỗi", "Không thể xóa các thông báo. Bạn chỉ có thể xóa thông báo của chính mình.")
      } finally {
        setIsProcessing(false)
      }
    },
    [showFeedback, triggerTableRefresh]
  )

  const handleDeleteAll = useCallback(() => {
    setDeleteAllConfirm(true)
  }, [])

  const confirmDeleteAll = useCallback(async () => {
    try {
      setIsProcessing(true)
      const result = await deleteAllNotifications.mutateAsync(undefined)
      showFeedback(
        "success",
        "Đã xóa tất cả",
        result.message || `Đã xóa ${result.count} thông báo thành công.`
      )
      setDeleteAllConfirm(false)
      // Trigger refresh bằng cách invalidate queries
      // NotificationBell và các components khác sẽ tự động refetch
      triggerTableRefresh()
    } catch (error: unknown) {
      const errorMessage = 
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Không thể xóa tất cả thông báo."
      showFeedback("error", "Lỗi", errorMessage)
    } finally {
      setIsProcessing(false)
    }
  }, [deleteAllNotifications, showFeedback, triggerTableRefresh])

  const baseColumns = useMemo<DataTableColumn<NotificationRow>[]>(
    () => [
      {
        accessorKey: "userEmail",
        header: "Người dùng",
        filter: { placeholder: "Lọc email..." },
        searchable: true,
        className: "min-w-[200px]",
        headerClassName: "min-w-[200px]",
        cell: (row) => {
          const isOwner = session?.user?.id === row.userId
          return (
            <div className="flex items-center gap-2">
              <div>
                <div className="font-medium">{row.userEmail || "-"}</div>
                {row.userName && <div className="text-sm text-muted-foreground">{row.userName}</div>}
              </div>
              {isOwner && (
                <Badge variant="outline" className="text-xs">
                  Của bạn
                </Badge>
              )}
            </div>
          )
        },
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
        ? ({ selectedIds, clearSelection, refresh }) => {
            // Wrap handlers với refresh function
            const handleBulkMarkAsReadWithRefresh = async () => {
              await handleBulkMarkAsRead(selectedIds)
              refresh?.() // Trigger table refresh
            }

            return (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBulkMarkAsReadWithRefresh}
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
                        refresh?.() // Trigger table refresh
                      },
                    })
                  }}
                  disabled={isProcessing}
                  title="Chỉ có thể xóa các thông báo mà bạn là chủ sở hữu"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Xóa ({selectedIds.length})
                </Button>
              </div>
            )
          }
        : undefined,
      rowActions: canManage
        ? (row, context) => {
            // Chỉ chủ sở hữu mới được xóa notification
            const isOwner = session?.user?.id === row.userId
            
            // Wrap handlers với refresh function từ context
            const handleMarkAsReadWithRefresh = async () => {
              await handleMarkAsRead(row)
              context?.refresh?.() // Trigger table refresh
            }

            const handleMarkAsUnreadWithRefresh = async () => {
              await handleMarkAsUnread(row)
              context?.refresh?.() // Trigger table refresh
            }
            
            return (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <span className="sr-only">Mở menu</span>
                    <span>⋮</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {row.isRead ? (
                    <DropdownMenuItem onClick={handleMarkAsUnreadWithRefresh}>
                      <EyeOff className="mr-2 h-4 w-4" />
                      Đánh dấu chưa đọc
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={handleMarkAsReadWithRefresh}>
                      <Eye className="mr-2 h-4 w-4" />
                      Đánh dấu đã đọc
                    </DropdownMenuItem>
                  )}
                  {/* Chỉ hiển thị option xóa nếu user là chủ sở hữu */}
                  {isOwner ? (
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => {
                        setDeleteConfirm({
                          open: true,
                          row,
                          onConfirm: async () => {
                            await handleDelete(row)
                            setDeleteConfirm(null)
                            context?.refresh?.() // Trigger table refresh
                          },
                        })
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Xóa thông báo
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      disabled
                      className="text-muted-foreground opacity-50 cursor-not-allowed"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      <span className="text-xs">Chỉ chủ sở hữu mới được xóa</span>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )
          }
        : undefined,
    },
  ]

  const initialDataByView = {
    all: initialData,
  }

  // Header actions: Xóa tất cả notification của chính user
  const headerActions = canManage ? (
    <Button
      variant="destructive"
      size="sm"
      onClick={handleDeleteAll}
      disabled={deleteAllNotifications.isPending || isProcessing}
      className="h-8 text-xs"
      title="Xóa tất cả thông báo của bạn (chỉ xóa notification của chính bạn)"
    >
      {deleteAllNotifications.isPending ? (
        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
      ) : (
        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
      )}
      Xóa tất cả
    </Button>
  ) : undefined

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
        headerActions={headerActions}
        onRefreshReady={handleRefreshReady}
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
              ? `Bạn có chắc chắn muốn xóa ${deleteConfirm.bulkIds.length} thông báo đã chọn? Chỉ các thông báo mà bạn là chủ sở hữu mới được xóa.`
              : "Bạn có chắc chắn muốn xóa thông báo này?"
          }
          variant="destructive"
          confirmLabel="Xóa"
          cancelLabel="Hủy"
          onConfirm={deleteConfirm.onConfirm}
          isLoading={isProcessing}
        />
      )}

      <ConfirmDialog
        open={deleteAllConfirm}
        onOpenChange={(open) => {
          if (!open) setDeleteAllConfirm(false)
        }}
        title="Xóa tất cả thông báo"
        description="Bạn có chắc chắn muốn xóa TẤT CẢ thông báo của bạn? Hành động này không thể hoàn tác. Chỉ các thông báo mà bạn là chủ sở hữu mới được xóa."
        variant="destructive"
        confirmLabel="Xóa tất cả"
        cancelLabel="Hủy"
        onConfirm={confirmDeleteAll}
        isLoading={deleteAllNotifications.isPending || isProcessing}
      />

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

