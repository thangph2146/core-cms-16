import type { DataTableResult } from "@/components/tables"
import { logger } from "@/lib/config"
import { listNotifications } from "../server/queries"
import { serializeNotificationsList } from "../server/helpers"
import type { NotificationRow } from "../types"
import { NotificationsTableClient } from "./notifications-table.client"

export interface NotificationsTableProps {
  canManage?: boolean
  userId?: string // Nếu có, chỉ fetch notifications của user này (không phải super admin)
  isSuperAdmin?: boolean // Flag để biết user có phải super admin không
}

export async function NotificationsTable({ canManage, userId, isSuperAdmin }: NotificationsTableProps) {
  // Fetch data với error handling
  let initialData: DataTableResult<NotificationRow> = {
    rows: [],
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  }

  try {
    // Nếu userId được truyền vào, chỉ fetch notifications của user đó
    // Nếu không (super admin), fetch tất cả notifications
    // Theo chuẩn Next.js 16: không cache admin data
    const initial = await listNotifications({
      page: 1,
      limit: 10,
      userId,
      isSuperAdmin,
    })
    initialData = serializeNotificationsList(initial)
  } catch (error) {
    logger.error("Error in NotificationsTable Server Component", error as Error)
    // initialData đã được set với empty data mặc định
  }

  // Return JSX sau khi đã có data an toàn (không wrap trong try/catch)
  return <NotificationsTableClient canManage={canManage} initialData={initialData} isSuperAdmin={isSuperAdmin} />
}

