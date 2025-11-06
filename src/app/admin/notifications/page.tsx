import { AdminHeader } from "@/components/headers"
import { PERMISSIONS, canPerformAction, isSuperAdmin } from "@/lib/permissions"
import { getPermissions, getSession } from "@/lib/auth/auth-server"
import { NotificationsTable } from "@/features/admin/notifications/components/notifications-table"

interface SessionWithMeta {
  user?: {
    id?: string
    email?: string | null
    name?: string | null
  }
  roles?: Array<{ name: string }>
  permissions?: Array<string>
}

/**
 * Notifications Page - TẤT CẢ ROLES ĐƯỢC TRUY CẬP
 * 
 * Page này hiển thị thông báo:
 * - Super Admin: Xem tất cả thông báo trong hệ thống
 * - Các roles khác: Chỉ xem thông báo của chính họ
 * 
 * Permission checking:
 * - Page access: Tất cả roles có NOTIFICATIONS_VIEW permission
 * - UI actions: canManage (dựa trên NOTIFICATIONS_MANAGE permission)
 */
export default async function NotificationsPage() {
  const session = (await getSession()) as SessionWithMeta | null
  const permissions = await getPermissions()
  const roles = session?.roles ?? []

  
  // Kiểm tra super admin để quyết định xem tất cả hay chỉ của user
  const isSuperAdminUser = isSuperAdmin(roles)
  
  // Nếu không phải super admin, chỉ xem notifications của chính họ
  const userId = isSuperAdminUser ? undefined : session?.user?.id

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
        <NotificationsTable canManage={canManage} userId={userId} isSuperAdmin={isSuperAdminUser} />
      </div>
    </>
  )
}

