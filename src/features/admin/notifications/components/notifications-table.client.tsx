"use client"

import { useCallback, useEffect, useMemo, useRef } from "react"
import { CheckCircle2, Trash2, BellOff } from "lucide-react"
import { useSession } from "next-auth/react"
import { useQueryClient } from "@tanstack/react-query"
import { queryKeys, invalidateQueries } from "@/lib/query-keys"
import { apiRoutes } from "@/lib/api/routes"
import type { DataTableQueryState, DataTableResult } from "@/components/tables"
import { FeedbackDialog } from "@/components/dialogs"
import { Button } from "@/components/ui/button"
import { ResourceTableClient } from "@/features/admin/resources/components/resource-table.client"
import type { ResourceViewMode, ResourceTableLoader } from "@/features/admin/resources/types"
import { apiClient } from "@/lib/api/axios"
import { logger } from "@/lib/config"
import type { NotificationRow } from "../types"
import { useNotificationActions } from "../hooks/use-notification-actions"
import { useNotificationFeedback } from "../hooks/use-notification-feedback"
import { useNotificationsSocketBridge } from "../hooks/use-notifications-socket-bridge"
import { useNotificationColumns } from "../utils/columns"
import { useNotificationRowActions } from "../utils/row-actions"
import { NOTIFICATION_LABELS } from "../constants"

interface NotificationsTableClientProps {
  canManage?: boolean
  initialData: DataTableResult<NotificationRow>
  isSuperAdmin?: boolean
}

export function NotificationsTableClient({
  canManage = false,
  initialData,
  isSuperAdmin: _isSuperAdminProp = false,
}: NotificationsTableClientProps) {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const tableRefreshRef = useRef<(() => void) | null>(null)
  const tableSoftRefreshRef = useRef<(() => void) | null>(null)
  const pendingRealtimeRefreshRef = useRef(false)

  const { feedback, showFeedback, handleFeedbackOpenChange } = useNotificationFeedback()
  const { cacheVersion } = useNotificationsSocketBridge()

  const triggerTableRefresh = useCallback(() => {
    logger.info("triggerTableRefresh called", {
      hasRefreshFn: !!tableRefreshRef.current,
    })
    
    invalidateQueries.adminNotifications(queryClient)
    logger.debug("Admin notifications queries invalidated")
    
    if (tableRefreshRef.current) {
      logger.info("Calling table refresh function")
      tableRefreshRef.current()
    } else {
      logger.warn("Table refresh function not available yet")
    }
  }, [queryClient])

  const {
    handleToggleRead,
    handleBulkMarkAsRead,
    handleBulkMarkAsUnread,
    handleDeleteSingle,
    handleBulkDelete,
    togglingNotifications,
    bulkState,
  } = useNotificationActions({
    showFeedback,
    triggerTableRefresh,
  })

  const handleToggleReadWithRefresh = useCallback(
    (row: NotificationRow, checked: boolean) => {
      if (tableRefreshRef.current) {
        handleToggleRead(row, checked, tableRefreshRef.current)
      }
    },
    [handleToggleRead],
  )

  const handleDeleteSingleWithRefresh = useCallback(
    (row: NotificationRow) => {
      if (tableRefreshRef.current) {
        handleDeleteSingle(row, tableRefreshRef.current)
      }
    },
    [handleDeleteSingle],
  )

  const { baseColumns } = useNotificationColumns({
    togglingNotifications,
    sessionUserId: session?.user?.id,
    onToggleRead: handleToggleReadWithRefresh,
  })

  const { renderRowActionsForNotifications } = useNotificationRowActions({
    sessionUserId: session?.user?.id,
    onToggleRead: handleToggleReadWithRefresh,
    onDelete: handleDeleteSingleWithRefresh,
  })

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
    
    // Admin notifications query không có params structure như comments
    // Chúng ta chỉ cần set vào cache với key ["notifications", "admin"]
    const queryKey = queryKeys.notifications.admin()
    queryClient.setQueryData(queryKey, initialData)
    
    logger.debug("Set initial data to cache", {
      queryKey: queryKey.slice(0, 2),
      rowsCount: initialData.rows.length,
      total: initialData.total,
    })
  }, [initialData, queryClient])

  const handleRefreshReady = useCallback((refresh: () => void) => {
    const wrapped = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.admin(), refetchType: "none" })
      refresh()
    }
    tableSoftRefreshRef.current = refresh
    tableRefreshRef.current = wrapped

    if (pendingRealtimeRefreshRef.current) {
      pendingRealtimeRefreshRef.current = false
      refresh()
    }
  }, [queryClient])

  const loader: ResourceTableLoader<NotificationRow> = useCallback(
    async (query: DataTableQueryState, _view: ResourceViewMode<NotificationRow>) => {
      const baseUrl = apiRoutes.adminNotifications.list({
        page: query.page,
        limit: query.limit,
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

      logger.debug("Loading notifications from API", {
        url,
        page: query.page,
        limit: query.limit,
        search: query.search.trim() || undefined,
        filters: query.filters,
      })

      const response = await apiClient.get<{
        success: boolean
        data: {
          data: NotificationRow[]
          pagination: {
            page: number
            limit: number
            total: number
            totalPages: number
          }
        }
        error?: string
        message?: string
      }>(url)

      const payload = response.data.data
      if (!payload) {
        logger.error("Failed to load notifications - no payload", {
          error: response.data.error,
          message: response.data.message,
        })
        throw new Error(response.data.error || response.data.message || "Không nhận được dữ liệu thông báo")
      }

      logger.info("Notifications loaded successfully (client)", {
        totalNotifications: payload.data.length,
        pagination: payload.pagination,
      })

      return {
        rows: payload.data,
        page: payload.pagination.page,
        limit: payload.pagination.limit,
        total: payload.pagination.total,
        totalPages: payload.pagination.totalPages,
      }
    },
    [],
  )

  const viewModes: ResourceViewMode<NotificationRow>[] = useMemo(
    () => [
      {
        id: "all",
        label: NOTIFICATION_LABELS.ALL,
        columns: baseColumns,
        selectionEnabled: canManage,
        selectionActions: canManage
          ? ({ selectedIds, selectedRows, clearSelection, refresh }) => {
              const ownNotifications = selectedRows.filter((row) => row.userId === session?.user?.id)
              const otherCount = selectedIds.length - ownNotifications.length

              const unreadNotifications = ownNotifications.filter((row) => !row.isRead)
              const unreadNotificationIds = unreadNotifications.map((row) => row.id)
              const readNotifications = ownNotifications.filter((row) => row.isRead)
              const readNotificationIds = readNotifications.map((row) => row.id)

              const deletableNotifications = ownNotifications.filter((row) => row.kind !== "SYSTEM")
              const deletableNotificationIds = deletableNotifications.map((row) => row.id)
              const systemCount = ownNotifications.length - deletableNotifications.length

              const handleBulkMarkAsReadWithRefresh = async () => {
                await handleBulkMarkAsRead(unreadNotificationIds, ownNotifications)
                refresh?.()
              }

              const handleBulkMarkAsUnreadWithRefresh = async () => {
                await handleBulkMarkAsUnread(readNotificationIds, ownNotifications)
                refresh?.()
              }

              const handleBulkDeleteWithRefresh = async () => {
                await handleBulkDelete(selectedIds, selectedRows)
                refresh?.()
              }

              return (
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                  <span>
                    Đã chọn <strong>{selectedIds.length}</strong> thông báo
                    {(otherCount > 0 || systemCount > 0) && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({systemCount > 0 && `${systemCount} hệ thống, `}
                        {otherCount > 0 && `${otherCount} không thuộc về bạn`}
                        {systemCount > 0 && otherCount === 0 && "không thể xóa"})
                      </span>
                    )}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleBulkMarkAsReadWithRefresh}
                      disabled={bulkState.isProcessing || unreadNotificationIds.length === 0}
                    >
                      <CheckCircle2 className="mr-2 h-5 w-5" />
                      Đánh dấu đã đọc ({unreadNotificationIds.length})
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleBulkMarkAsUnreadWithRefresh}
                      disabled={bulkState.isProcessing || readNotificationIds.length === 0}
                    >
                      <BellOff className="mr-2 h-5 w-5" />
                      Đánh dấu chưa đọc ({readNotificationIds.length})
                    </Button>
                    {deletableNotificationIds.length > 0 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={handleBulkDeleteWithRefresh}
                        disabled={bulkState.isProcessing || deletableNotificationIds.length === 0}
                      >
                        <Trash2 className="mr-2 h-5 w-5" />
                        Xóa ({deletableNotificationIds.length})
                      </Button>
                    )}
                    <Button type="button" size="sm" variant="ghost" onClick={clearSelection}>
                      {NOTIFICATION_LABELS.CLEAR_SELECTION}
                    </Button>
                  </div>
                </div>
              )
            }
          : undefined,
        rowActions: (row) => renderRowActionsForNotifications(row),
      },
    ],
    [
      canManage,
      baseColumns,
      session?.user?.id,
      handleBulkMarkAsRead,
      handleBulkMarkAsUnread,
      handleBulkDelete,
      bulkState.isProcessing,
      renderRowActionsForNotifications,
    ],
  )

  const initialDataByView = useMemo(
    () => ({
      all: initialData,
    }),
    [initialData],
  )

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
