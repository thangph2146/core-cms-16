import { AdminHeader } from "@/components/headers"
import { PERMISSIONS, canPerformAction } from "@/lib/permissions"
import { getPermissions, getSession } from "@/lib/auth/auth-server"
import { NotificationsTable } from "@/features/admin/notifications/components/notifications-table"

interface SessionWithMeta {
  roles?: Array<{ name: string }>
  permissions?: Array<string>
}

/**
 * Notifications Page
 * 
 * Permission checking cho page access đã được xử lý ở layout level (PermissionGate)
 * Chỉ cần check permissions cho UI actions (canManage)
 */
export default async function NotificationsPage() {
  const session = (await getSession()) as SessionWithMeta | null
  const permissions = await getPermissions()
  const roles = session?.roles ?? []

  // Check permissions cho UI actions
  const canManage = canPerformAction(permissions, roles, PERMISSIONS.NOTIFICATIONS_MANAGE)

  return (
    <>
      <AdminHeader
        breadcrumbs={[
          { label: "Thông báo", isActive: true },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <NotificationsTable canManage={canManage} />
      </div>
    </>
  )
}

