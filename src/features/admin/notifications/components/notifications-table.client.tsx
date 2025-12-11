"use client"

import { useCallback, useMemo, useState } from "react"
import { CheckCircle2, Trash2, BellOff } from "lucide-react"
import { useSession } from "next-auth/react"
import { useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"
import { apiRoutes } from "@/lib/api/routes"
import type { DataTableQueryState, DataTableResult } from "@/components/tables"
import { FeedbackDialog } from "@/components/dialogs"
import { Button } from "@/components/ui/button"
import {
  ResourceTableClient,
  SelectionActionsWrapper,
} from "@/features/admin/resources/components"
import type { ResourceViewMode } from "@/features/admin/resources/types"
import {
  useResourceTableLoader,
  useResourceTableRefresh,
  useResourceTableLogger,
} from "@/features/admin/resources/hooks"
import { normalizeSearch, sanitizeFilters } from "@/features/admin/resources/utils"
import { apiClient } from "@/lib/api/axios"
import { logger } from "@/lib/config"
import type { NotificationRow } from "../types"
import { useNotificationActions } from "../hooks/use-notification-actions"
import { useNotificationFeedback } from "../hooks/use-notification-feedback"
import { useNotificationDeleteConfirm } from "../hooks/use-notification-delete-confirm"
import { useNotificationsSocketBridge } from "../hooks/use-notifications-socket-bridge"
import { useNotificationColumns } from "../utils/columns"
import { useNotificationRowActions } from "../utils/row-actions"
import { NOTIFICATION_LABELS, NOTIFICATION_CONFIRM_MESSAGES } from "../constants"
import { ConfirmDialog } from "@/components/dialogs"

type AdminNotificationsListParams = {
  page: number
  limit: number
  search?: string
  filters?: Record<string, string>
  status?: "all" | "read" | "unread"
}

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
  const { cacheVersion } = useNotificationsSocketBridge()
  
  const [currentViewId, setCurrentViewId] = useState<string>("all")
  
  const buildNotificationsQueryKeyForLogger = useCallback(
    (params: { status?: string; page?: number; limit?: number; search?: string; filters?: Record<string, string> }): readonly unknown[] => {
      return [
        "notifications",
        "admin",
        params.status ?? "all",
        params.page ?? 1,
        params.limit ?? 10,
        "",
      ]
    },
    [],
  )
  
  useResourceTableLogger<NotificationRow>({
    resourceName: "notifications",
    initialData,
    initialDataByView: initialData ? { all: initialData } : undefined,
    currentViewId,
    queryClient,
    buildQueryKey: buildNotificationsQueryKeyForLogger,
    columns: ["id", "userId", "userEmail", "kind", "title", "description", "isRead", "createdAt"],
    getRowData: (row) => ({
      id: row.id,
      userId: row.userId,
      userEmail: row.userEmail,
      kind: row.kind,
      title: row.title,
      description: row.description,
      isRead: row.isRead,
      createdAt: row.createdAt,
    }),
    cacheVersion,
  })
  
  const getInvalidateQueryKey = useCallback(() => queryKeys.notifications.admin(), [])
  const { onRefreshReady, refresh: refreshTable } = useResourceTableRefresh({
    queryClient,
    getInvalidateQueryKey,
    cacheVersion,
  })

  const { feedback, showFeedback, handleFeedbackOpenChange } = useNotificationFeedback()
  const { deleteConfirm, setDeleteConfirm, handleDeleteConfirm } = useNotificationDeleteConfirm()

  const triggerTableRefresh = useCallback(() => {
    logger.info("triggerTableRefresh called")
    refreshTable()
  }, [refreshTable])

  const {
    handleToggleRead,
    handleBulkMarkAsRead,
    handleBulkMarkAsUnread,
    handleDeleteSingle,
    handleBulkDelete,
    togglingNotifications,
    markingReadNotifications,
    markingUnreadNotifications,
    deletingNotifications,
    bulkState,
  } = useNotificationActions({
    showFeedback,
    triggerTableRefresh,
  })

  const handleToggleReadWithRefresh = useCallback(
    (row: NotificationRow, checked: boolean) => {
      setDeleteConfirm({
        open: true,
        type: checked ? "mark-read" : "mark-unread",
        row,
        onConfirm: async () => {
          await handleToggleRead(row, checked, refreshTable)
        },
      })
    },
    [handleToggleRead, refreshTable, setDeleteConfirm],
  )

  const handleDeleteSingleWithRefresh = useCallback(
    (row: NotificationRow) => {
      setDeleteConfirm({
        open: true,
        type: "delete",
        row,
        onConfirm: async () => {
          await handleDeleteSingle(row, refreshTable)
        },
      })
    },
    [handleDeleteSingle, refreshTable, setDeleteConfirm],
  )

  const { baseColumns } = useNotificationColumns({
    togglingNotifications,
    sessionUserId: session?.user?.id,
    onToggleRead: handleToggleReadWithRefresh,
  })

  const { renderRowActionsForNotifications } = useNotificationRowActions({
    sessionUserId: session?.user?.id,
    onDelete: handleDeleteSingleWithRefresh,
    deletingNotifications,
  })

  const fetchNotifications = useCallback(
    async ({
      page,
      limit,
      search,
      filters,
      status,
    }: {
      page: number
      limit: number
      search?: string
      filters?: Record<string, string>
      status: "all" | "read" | "unread"
    }): Promise<DataTableResult<NotificationRow>> => {
      const baseUrl = apiRoutes.adminNotifications.list({
        page,
        limit,
        search,
      })

      const filterParams = new URLSearchParams()
      Object.entries(filters ?? {}).forEach(([key, value]) => {
        if (value) {
          filterParams.set(`filter[${key}]`, value)
        }
      })

      const filterString = filterParams.toString()
      const url = filterString ? `${baseUrl}&${filterString}` : baseUrl

      // Chỉ log khi có thay đổi quan trọng (search, filters, status) hoặc lỗi
      // Tránh log quá nhiều khi chỉ pagination thay đổi

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
        throw new Error(
          response.data.error || response.data.message || "Không nhận được dữ liệu thông báo",
        )
      }

      // Không log success để tránh spam - chỉ log errors

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

  const buildListParams = useCallback(
    ({ query, view }: { query: DataTableQueryState; view: ResourceViewMode<NotificationRow> }): AdminNotificationsListParams => {
      const filtersRecord = sanitizeFilters(query.filters)
      delete filtersRecord.isRead

      if (view.status === "unread") {
        filtersRecord.isRead = "false"
      } else if (view.status === "read") {
        filtersRecord.isRead = "true"
      }

      return {
        status: (view.status ?? "all") as AdminNotificationsListParams["status"],
        page: query.page,
        limit: query.limit,
        search: normalizeSearch(query.search),
        filters: Object.keys(filtersRecord).length ? filtersRecord : undefined,
      }
    },
    [],
  )

  const buildNotificationsQueryKey = useCallback(
    (params: AdminNotificationsListParams): readonly unknown[] => {
      const normalizedFilters = params.filters
        ? Object.entries(params.filters)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => `${key}:${value}`)
        : []

      return [
        "notifications",
        "admin",
        params.status ?? "all",
        params.page,
        params.limit,
        params.search ?? "",
        ...normalizedFilters,
      ]
    },
    [],
  )

  const fetchNotificationsWithDefaults = useCallback(
    (params: AdminNotificationsListParams) =>
      fetchNotifications({
        page: params.page,
        limit: params.limit,
        search: params.search,
        filters: params.filters,
        status: (params.status ?? "all") as "all" | "read" | "unread",
      }),
    [fetchNotifications],
  )

  const loader = useResourceTableLoader<NotificationRow, AdminNotificationsListParams>({
    queryClient,
    fetcher: fetchNotificationsWithDefaults,
    buildParams: buildListParams,
    buildQueryKey: buildNotificationsQueryKey,
  })



  const createSelectionActions = useCallback(
    ({ selectedIds, selectedRows, clearSelection, refresh }: {
      selectedIds: string[]
      selectedRows: NotificationRow[]
      clearSelection: () => void
      refresh: () => void
    }) => {
      const ownNotifications = selectedRows.filter((row) => row.userId === session?.user?.id)
      const otherCount = selectedIds.length - ownNotifications.length

      const unreadNotifications = ownNotifications.filter((row) => !row.isRead)
      const unreadNotificationIds = unreadNotifications.map((row) => row.id)
      const readNotifications = ownNotifications.filter((row) => row.isRead)
      const readNotificationIds = readNotifications.map((row) => row.id)

      const deletableNotifications = ownNotifications.filter((row) => row.kind !== "SYSTEM")
      const deletableNotificationIds = deletableNotifications.map((row) => row.id)
      const systemCount = ownNotifications.length - deletableNotifications.length

      const handleBulkMarkAsReadWithRefresh = () => {
        setDeleteConfirm({
          open: true,
          type: "mark-read",
          bulkIds: unreadNotificationIds,
          onConfirm: async () => {
            await handleBulkMarkAsRead(unreadNotificationIds, ownNotifications)
            refresh?.()
          },
        })
      }

      const handleBulkMarkAsUnreadWithRefresh = () => {
        setDeleteConfirm({
          open: true,
          type: "mark-unread",
          bulkIds: readNotificationIds,
          onConfirm: async () => {
            await handleBulkMarkAsUnread(readNotificationIds, ownNotifications)
            refresh?.()
          },
        })
      }

      const handleBulkDeleteWithRefresh = () => {
        setDeleteConfirm({
          open: true,
          type: "delete",
          bulkIds: deletableNotificationIds,
          onConfirm: async () => {
            await handleBulkDelete(selectedIds, selectedRows)
            refresh?.()
          },
        })
      }

      return (
        <SelectionActionsWrapper
          label={NOTIFICATION_LABELS.SELECTED_NOTIFICATIONS(selectedIds.length)}
          labelSuffix={
            (otherCount > 0 || systemCount > 0) && (
              <>
                ({systemCount > 0 && `${systemCount} hệ thống, `}
                {otherCount > 0 && `${otherCount} không thuộc về bạn`}
                {systemCount > 0 && otherCount === 0 && "không thể xóa"})
              </>
            )
          }
          actions={
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleBulkMarkAsReadWithRefresh}
                disabled={bulkState.isProcessing || unreadNotificationIds.length === 0}
                className="whitespace-nowrap"
              >
                <CheckCircle2 className="mr-2 h-5 w-5 shrink-0" />
                <span className="hidden sm:inline">
                  {NOTIFICATION_LABELS.MARK_READ_SELECTED(unreadNotificationIds.length)}
                </span>
                <span className="sm:hidden">Đã đọc</span>
              </Button>
              <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleBulkMarkAsUnreadWithRefresh}
              disabled={bulkState.isProcessing || readNotificationIds.length === 0}
              className="whitespace-nowrap"
            >
                <BellOff className="mr-2 h-5 w-5 shrink-0" />
                <span className="hidden sm:inline">
                  {NOTIFICATION_LABELS.MARK_UNREAD_SELECTED(readNotificationIds.length)}
                </span>
                <span className="sm:hidden">Chưa đọc</span>
              </Button>
              {deletableNotificationIds.length > 0 && (
                <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={handleBulkDeleteWithRefresh}
                disabled={bulkState.isProcessing || deletableNotificationIds.length === 0}
                className="whitespace-nowrap"
              >
                  <Trash2 className="mr-2 h-5 w-5 shrink-0" />
                  <span className="hidden sm:inline">
                    {NOTIFICATION_LABELS.DELETE_SELECTED(deletableNotificationIds.length)}
                  </span>
                  <span className="sm:hidden">Xóa</span>
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={clearSelection}
                className="whitespace-nowrap"
              >
                {NOTIFICATION_LABELS.CLEAR_SELECTION}
              </Button>
            </>
          }
        />
      )
    },
    [
      session?.user?.id,
      handleBulkMarkAsRead,
      handleBulkMarkAsUnread,
      handleBulkDelete,
      bulkState.isProcessing,
      setDeleteConfirm,
    ],
  )

  const viewModes: ResourceViewMode<NotificationRow>[] = useMemo(
    () => [
      {
        id: "all",
        label: NOTIFICATION_LABELS.ALL,
        status: "all",
        columns: baseColumns,
        selectionEnabled: canManage,
        selectionActions: canManage ? createSelectionActions : undefined,
        rowActions: (row) => renderRowActionsForNotifications(row),
        emptyMessage: NOTIFICATION_LABELS.NO_NOTIFICATIONS,
      },
      {
        id: "unread",
        label: NOTIFICATION_LABELS.UNREAD_VIEW,
        status: "unread",
        columns: baseColumns,
        selectionEnabled: canManage,
        selectionActions: canManage ? createSelectionActions : undefined,
        rowActions: (row) => renderRowActionsForNotifications(row),
        emptyMessage: "Không có thông báo chưa đọc",
      },
      {
        id: "read",
        label: NOTIFICATION_LABELS.READ_VIEW,
        status: "read",
        columns: baseColumns,
        selectionEnabled: canManage,
        selectionActions: canManage ? createSelectionActions : undefined,
        rowActions: (row) => renderRowActionsForNotifications(row),
        emptyMessage: "Không có thông báo đã đọc",
      },
    ],
    [
      canManage,
      baseColumns,
      createSelectionActions,
      renderRowActionsForNotifications,
    ],
  )

  const initialDataByView = useMemo(
    () => ({
      all: initialData,
      unread: {
        ...initialData,
        rows: initialData.rows.filter((row) => !row.isRead),
        total: initialData.rows.filter((row) => !row.isRead).length,
      },
      read: {
        ...initialData,
        rows: initialData.rows.filter((row) => row.isRead),
        total: initialData.rows.filter((row) => row.isRead).length,
      },
    }),
    [initialData],
  )

  const getDeleteConfirmTitle = useCallback(() => {
    if (!deleteConfirm) return ""
    const count = deleteConfirm.bulkIds?.length
    switch (deleteConfirm.type) {
      case "mark-read":
        return NOTIFICATION_CONFIRM_MESSAGES.MARK_READ_TITLE(count)
      case "mark-unread":
        return NOTIFICATION_CONFIRM_MESSAGES.MARK_UNREAD_TITLE(count)
      case "delete":
        return NOTIFICATION_CONFIRM_MESSAGES.DELETE_TITLE(count)
      default:
        return ""
    }
  }, [deleteConfirm])

  const getDeleteConfirmDescription = useCallback(() => {
    if (!deleteConfirm) return ""
    const count = deleteConfirm.bulkIds?.length
    switch (deleteConfirm.type) {
      case "mark-read":
        return NOTIFICATION_CONFIRM_MESSAGES.MARK_READ_DESCRIPTION(count)
      case "mark-unread":
        return NOTIFICATION_CONFIRM_MESSAGES.MARK_UNREAD_DESCRIPTION(count)
      case "delete":
        return NOTIFICATION_CONFIRM_MESSAGES.DELETE_DESCRIPTION(count)
      default:
        return ""
    }
  }, [deleteConfirm])

  const handleViewChange = useCallback((viewId: string) => {
    setCurrentViewId(viewId)
  }, [])

  return (
    <>
      <ResourceTableClient
        title={NOTIFICATION_LABELS.MANAGE_NOTIFICATIONS}
        baseColumns={baseColumns}
        loader={loader}
        viewModes={viewModes}
        defaultViewId="all"
        initialDataByView={initialDataByView}
        fallbackRowCount={6}
        onRefreshReady={onRefreshReady}
        onViewChange={handleViewChange}
      />

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <ConfirmDialog
          open={deleteConfirm.open}
          onOpenChange={(open) => {
            if (!open) setDeleteConfirm(null)
          }}
          title={getDeleteConfirmTitle()}
          description={getDeleteConfirmDescription()}
          variant={
            deleteConfirm.type === "delete"
              ? "destructive"
              : "default"
          }
          confirmLabel={
            deleteConfirm.type === "mark-read"
              ? NOTIFICATION_CONFIRM_MESSAGES.MARK_READ_LABEL
              : deleteConfirm.type === "mark-unread"
              ? NOTIFICATION_CONFIRM_MESSAGES.MARK_UNREAD_LABEL
              : NOTIFICATION_CONFIRM_MESSAGES.CONFIRM_LABEL
          }
          cancelLabel={NOTIFICATION_CONFIRM_MESSAGES.CANCEL_LABEL}
          onConfirm={handleDeleteConfirm}
          isLoading={
            bulkState.isProcessing ||
            (deleteConfirm.row
              ? (() => {
                  switch (deleteConfirm.type) {
                    case "mark-read":
                      return markingReadNotifications.has(deleteConfirm.row.id)
                    case "mark-unread":
                      return markingUnreadNotifications.has(deleteConfirm.row.id)
                    case "delete":
                      return deletingNotifications.has(deleteConfirm.row.id)
                    default:
                      return false
                  }
                })()
              : false)
          }
        />
      )}

      {/* Feedback Dialog */}
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
