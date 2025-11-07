"use client"

import { useCallback, useEffect, useMemo, useState, useRef } from "react"
import { Eye, CheckCircle2, MoreHorizontal, Circle } from "lucide-react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useQueryClient, useQuery } from "@tanstack/react-query"
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
import { useDynamicFilterOptions } from "@/features/admin/resources/hooks/use-dynamic-filter-options"
import { apiClient } from "@/lib/api/axios"
import { useAdminNotificationsSocketBridge } from "@/hooks/use-notifications"
import { logger } from "@/lib/config"
import type { NotificationRow } from "../types"

interface NotificationsTableClientProps {
  canManage?: boolean
  initialData: DataTableResult<NotificationRow>
  isSuperAdmin?: boolean // Flag để biết user có phải super admin không
}

interface FeedbackState {
  open: boolean
  variant: FeedbackVariant
  title: string
  description?: string
  details?: string
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
  isSuperAdmin: _isSuperAdminProp = false,
}: NotificationsTableClientProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  
  const [isProcessing, setIsProcessing] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackState | null>(null)
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
    []
  )

  const handleMarkAsRead = useCallback(
    async (row: NotificationRow) => {
      // Kiểm tra quyền: chỉ cho phép đánh dấu notification của chính mình
      const isOwner = session?.user?.id === row.userId
      
      if (!isOwner) {
        showFeedback("error", "Không có quyền", "Bạn chỉ có thể đánh dấu đã đọc thông báo của chính mình.")
        return
      }

      try {
        setIsProcessing(true)
        await apiClient.patch(apiRoutes.notifications.markRead(row.id), { isRead: true })
        showFeedback("success", "Đã đánh dấu đã đọc", "Thông báo đã được đánh dấu là đã đọc.")
        triggerTableRefresh()
      } catch (error: unknown) {
        const errorMessage = 
          (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "Không thể đánh dấu đã đọc thông báo."
        showFeedback("error", "Lỗi", errorMessage)
      } finally {
        setIsProcessing(false)
      }
    },
    [showFeedback, triggerTableRefresh, session?.user?.id]
  )

  const handleMarkAsUnread = useCallback(
    async (row: NotificationRow) => {
      // Kiểm tra quyền: chỉ cho phép đánh dấu notification của chính mình
      const isOwner = session?.user?.id === row.userId
      
      if (!isOwner) {
        showFeedback("error", "Không có quyền", "Bạn chỉ có thể đánh dấu chưa đọc thông báo của chính mình.")
        return
      }

      try {
        setIsProcessing(true)
        await apiClient.patch(apiRoutes.notifications.markRead(row.id), { isRead: false })
        showFeedback("success", "Đã đánh dấu chưa đọc", "Thông báo đã được đánh dấu là chưa đọc.")
        triggerTableRefresh()
      } catch (error: unknown) {
        const errorMessage = 
          (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "Không thể đánh dấu chưa đọc thông báo."
        showFeedback("error", "Lỗi", errorMessage)
      } finally {
        setIsProcessing(false)
      }
    },
    [showFeedback, triggerTableRefresh, session?.user?.id]
  )

  const handleBulkMarkAsRead = useCallback(
    async (ids: string[], rows?: NotificationRow[]) => {
      if (!session?.user?.id) {
        showFeedback("error", "Lỗi", "Bạn cần đăng nhập để thực hiện thao tác này.")
        return
      }

      // Filter chỉ notifications của chính user
      let ownNotificationIds: string[]
      if (rows) {
        // Nếu có rows data, filter theo userId
        ownNotificationIds = rows
          .filter((row) => row.userId === session.user.id)
          .map((row) => row.id)
      } else {
        // Nếu không có rows data, gọi API và để server filter
        // (API sẽ tự động reject notifications không thuộc về user)
        ownNotificationIds = ids
      }

      if (ownNotificationIds.length === 0) {
        showFeedback("error", "Không có quyền", "Bạn chỉ có thể đánh dấu đã đọc thông báo của chính mình.")
        return
      }

      try {
        setIsProcessing(true)
        const results = await Promise.allSettled(
          ownNotificationIds.map((id) => apiClient.patch(apiRoutes.notifications.markRead(id), { isRead: true }))
        )

        const successCount = results.filter((r) => r.status === "fulfilled").length
        const failedCount = results.filter((r) => r.status === "rejected").length

        if (successCount > 0) {
          showFeedback(
            "success",
            "Đã đánh dấu đã đọc",
            `Đã đánh dấu ${successCount} thông báo là đã đọc.${failedCount > 0 ? ` ${failedCount} thông báo không thể đánh dấu (không thuộc về bạn).` : ""}`
          )
          triggerTableRefresh()
        } else {
          showFeedback("error", "Lỗi", "Không thể đánh dấu đã đọc các thông báo. Bạn chỉ có thể đánh dấu thông báo của chính mình.")
        }
      } catch {
        showFeedback("error", "Lỗi", "Không thể đánh dấu đã đọc các thông báo.")
      } finally {
        setIsProcessing(false)
      }
    },
    [showFeedback, triggerTableRefresh, session?.user?.id]
  )


  const userEmailFilter = useDynamicFilterOptions({
    optionsEndpoint: apiRoutes.adminNotifications.options({ column: "userEmail" }),
  })

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
          const isOwner = session?.user?.id === row.userId
          return (
            <div className="flex items-center gap-2">
              <div>
                <div className="font-medium">{row.userEmail || "-"}</div>
                {row.userName && <div className="text-sm text-muted-foreground">{row.userName}</div>}
                {isOwner && (
                <Badge variant="outline" className="text-xs">
                  - Của bạn -
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
        className: "min-w-[250px]",
        headerClassName: "min-w-[250px]",
        cell: (row) => (
          <a
            href={`/admin/notifications/${row.id}`}
            className="font-medium text-primary hover:underline"
          >
            {row.title}
          </a>
        ),
      },
      {
        accessorKey: "description",
        header: "Mô tả",
        className: "min-w-[300px]",
        headerClassName: "min-w-[300px]",
        cell: (row) => row.description || "-",
      },
      {
        accessorKey: "isRead",
        header: "Trạng thái",
        filter: {
          type: "select",
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
    [dateFormatter, userEmailFilter.options, userEmailFilter.onSearchChange, userEmailFilter.isLoading, session?.user?.id]
  )

  const viewModes: ResourceViewMode<NotificationRow>[] = [
    {
      id: "all",
      label: "Tất cả",
      columns: baseColumns,
      selectionEnabled: canManage,
        selectionActions: canManage
        ? ({ selectedIds, selectedRows, refresh }) => {
            // Filter chỉ notifications của chính user
            const ownNotifications = selectedRows.filter((row) => row.userId === session?.user?.id)
            const ownNotificationIds = ownNotifications.map((row) => row.id)
            const otherCount = selectedIds.length - ownNotificationIds.length

            // Wrap handlers với refresh function
            const handleBulkMarkAsReadWithRefresh = async () => {
              await handleBulkMarkAsRead(ownNotificationIds, ownNotifications)
              refresh?.() // Trigger table refresh
            }

            return (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBulkMarkAsReadWithRefresh}
                  disabled={isProcessing || ownNotificationIds.length === 0}
                >
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Đánh dấu đã đọc ({ownNotificationIds.length}
                  {otherCount > 0 && ` / ${selectedIds.length}`})
                </Button>
                {otherCount > 0 && (
                  <span className="text-xs text-muted-foreground flex items-center">
                    ({otherCount} thông báo không thuộc về bạn)
                  </span>
                )}
              </div>
            )
          }
        : undefined,
      rowActions: canManage
        ? (row, context) => {
            // Chỉ chủ sở hữu mới được đánh dấu đã đọc/chưa đọc notification
            // Chỉ cho phép owner đánh dấu đã đọc
            const isOwner = session?.user?.id === row.userId
            const canMarkRead = isOwner
            
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
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <span className="sr-only">Mở menu</span>
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => router.push(`/admin/notifications/${row.id}`)}>
                    <Eye className="mr-2 h-5 w-5" />
                    Xem chi tiết
                  </DropdownMenuItem>
                  {/* Hiển thị option đánh dấu đã đọc/chưa đọc nếu user là chủ sở hữu hoặc super admin với notification SYSTEM */}
                  {canMarkRead && (
                    <>
                      {row.isRead ? (
                        <DropdownMenuItem onClick={handleMarkAsUnreadWithRefresh}>
                          <Circle className="mr-2 h-5 w-5" />
                          Đánh dấu chưa đọc
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={handleMarkAsReadWithRefresh}>
                          <CheckCircle2 className="mr-2 h-5 w-5" />
                          Đánh dấu đã đọc
                        </DropdownMenuItem>
                      )}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )
          }
        : (row) => (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/admin/notifications/${row.id}`)}
            >
              <Eye className="mr-2 h-5 w-5" />
              Xem chi tiết
            </Button>
          ),
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
        onRefreshReady={handleRefreshReady}
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

