/**
 * Server Component: Notifications Table
 * Fetches initial notification data and passes it to the client component
 */
import type { DataTableResult } from "@/components/tables"
import { listNotificationsCached } from "../server/queries"
import type { NotificationRow } from "../types"
import { NotificationsTableClient } from "./notifications-table.client"

/**
 * Serializes notification data from server query result to DataTable format
 */
function serializeInitialData(
  data: Awaited<ReturnType<typeof listNotificationsCached>>
): DataTableResult<NotificationRow> {
  return {
    page: data.pagination.page,
    limit: data.pagination.limit,
    total: data.pagination.total,
    totalPages: data.pagination.totalPages,
    rows: data.data.map((notification) => ({
      id: notification.id,
      userId: notification.userId,
      userEmail: notification.user.email,
      userName: notification.user.name,
      kind: notification.kind,
      title: notification.title,
      description: notification.description,
      isRead: notification.isRead,
      actionUrl: notification.actionUrl,
      createdAt: notification.createdAt.toISOString(),
      readAt: notification.readAt ? notification.readAt.toISOString() : null,
      expiresAt: notification.expiresAt ? notification.expiresAt.toISOString() : null,
    })),
  } satisfies DataTableResult<NotificationRow>
}

export interface NotificationsTableProps {
  canManage?: boolean
}

export async function NotificationsTable({ canManage }: NotificationsTableProps) {
  const initial = await listNotificationsCached(1, 10, "", "")
  const initialData = serializeInitialData(initial)

  return <NotificationsTableClient canManage={canManage} initialData={initialData} />
}

