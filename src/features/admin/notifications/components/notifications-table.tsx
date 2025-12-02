import type { DataTableResult } from "@/components/tables"
import { logger } from "@/lib/config"
import { listNotifications } from "../server/queries"
import { serializeNotificationsList } from "../server/helpers"
import type { NotificationRow } from "../types"
import { NotificationsTableClient } from "./notifications-table.client"

export interface NotificationsTableProps {
  canManage?: boolean
  userId?: string
  isSuperAdmin?: boolean
}

export async function NotificationsTable({ canManage, userId, isSuperAdmin }: NotificationsTableProps) {
  let initialData: DataTableResult<NotificationRow> = {
    rows: [],
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  }

  try {
    const initial = await listNotifications({
      page: 1,
      limit: 10,
      userId,
      isSuperAdmin,
    })
    initialData = serializeNotificationsList(initial)
  } catch (error) {
    logger.error("Error in NotificationsTable Server Component", error as Error)
  }

  return <NotificationsTableClient canManage={canManage} initialData={initialData} isSuperAdmin={isSuperAdmin} />
}

