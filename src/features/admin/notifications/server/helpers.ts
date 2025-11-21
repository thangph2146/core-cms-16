/**
 * Helper Functions for Notifications Server Logic
 * 
 * Chứa các helper functions được dùng chung bởi queries và components
 * Sử dụng generic helpers từ resources/server khi có thể
 */

import type { DataTableResult } from "@/components/tables"
import { logger } from "@/lib/config"
import { serializeDate } from "@/features/admin/resources/server"
import type { ListNotificationsResult, ListedNotification } from "./queries"
import type { NotificationRow } from "../types"

/**
 * Serialize notification data for DataTable format
 */
export function serializeNotificationForTable(notification: ListedNotification): NotificationRow {
  // Ensure createdAt is always a valid string (required field)
  const createdAt = notification.createdAt
    ? serializeDate(notification.createdAt) ?? new Date().toISOString()
    : new Date().toISOString()

  return {
    id: notification.id,
    userId: notification.userId,
    userEmail: notification.user?.email ?? null,
    userName: notification.user?.name ?? null,
    kind: notification.kind,
    title: notification.title,
    description: notification.description,
    isRead: notification.isRead,
    actionUrl: notification.actionUrl,
    createdAt,
    readAt: serializeDate(notification.readAt),
    expiresAt: serializeDate(notification.expiresAt),
  }
}

/**
 * Serialize ListNotificationsResult to DataTable format
 * Sử dụng pattern từ resources/server nhưng customize cho notifications
 */
export function serializeNotificationsList(data: ListNotificationsResult): DataTableResult<NotificationRow> {
  try {
    return {
      page: data.pagination.page,
      limit: data.pagination.limit,
      total: data.pagination.total,
      totalPages: data.pagination.totalPages,
      rows: data.data.map((notification) => {
        try {
          return serializeNotificationForTable(notification)
        } catch (error) {
          logger.error("Error serializing notification", { notificationId: notification.id, error: error as Error })
          // Return a safe fallback notification
          return {
            id: notification.id,
            userId: notification.userId,
            userEmail: null,
            userName: null,
            kind: notification.kind,
            title: notification.title ?? "N/A",
            description: notification.description,
            isRead: notification.isRead ?? false,
            actionUrl: notification.actionUrl,
            createdAt: notification.createdAt ? serializeDate(notification.createdAt) ?? new Date().toISOString() : new Date().toISOString(),
            readAt: serializeDate(notification.readAt),
            expiresAt: serializeDate(notification.expiresAt),
          }
        }
      }),
    }
  } catch (error) {
    logger.error("Error serializing notifications list", { data, error: error as Error })
    // Return empty result on error
    return {
      page: data.pagination?.page ?? 1,
      limit: data.pagination?.limit ?? 10,
      total: 0,
      totalPages: 0,
      rows: [],
    }
  }
}

/**
 * Serialize ListedNotification to client format (for detail page)
 */
export function serializeNotificationDetail(notification: ListedNotification) {
  return {
    id: notification.id,
    userId: notification.userId,
    user: notification.user,
    kind: notification.kind,
    title: notification.title,
    description: notification.description,
    isRead: notification.isRead,
    actionUrl: notification.actionUrl,
    metadata: notification.metadata,
    expiresAt: serializeDate(notification.expiresAt),
    createdAt: serializeDate(notification.createdAt)!,
    readAt: serializeDate(notification.readAt),
  }
}

