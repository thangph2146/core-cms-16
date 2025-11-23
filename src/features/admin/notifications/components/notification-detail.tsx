/**
 * Server Component: Notification Detail
 * 
 * Fetches notification data using cached server query and passes it to client component
 * for rendering UI with animations and interactions.
 * 
 * Pattern: Server Component (data fetching) -> Client Component (UI/interactions)
 */

import { getNotificationById } from "../server/queries"
import { serializeNotificationDetail } from "../server/helpers"
import { NotificationDetailClient } from "./notification-detail.client"
import type { NotificationDetailData } from "./notification-detail.client"
import { NotFoundMessage } from "@/features/admin/resources/components"

export interface NotificationDetailProps {
  notificationId: string
  backUrl?: string
}

/**
 * NotificationDetail Server Component
 * 
 * Fetches notification data on the server using non-cached query and passes it to client component.
 * Theo chuẩn Next.js 16: không cache admin data để đảm bảo data luôn fresh
 */
export async function NotificationDetail({ notificationId, backUrl = "/admin/notifications" }: NotificationDetailProps) {
  // Fetch notification data using non-cached query (theo chuẩn Next.js 16)
  const notification = await getNotificationById(notificationId)

  if (!notification) {
    return <NotFoundMessage resourceName="thông báo" />
  }

  // Transform notification data to match NotificationDetailData format (serialize dates)
  const notificationForDetail: NotificationDetailData = serializeNotificationDetail(notification) as NotificationDetailData

  // Pass data to client component for rendering
  return <NotificationDetailClient notification={notificationForDetail} backUrl={backUrl} />
}

