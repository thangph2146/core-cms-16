import { AdminHeader } from "@/components/headers"
import { PERMISSIONS, canPerformAction } from "@/lib/permissions"
import { getAuthInfo } from "@/features/admin/resources/server"
import { NotificationsTable } from "@/features/admin/notifications/components/notifications-table"
import { TablePageSuspense } from "@/features/admin/resources/components"

/**
 * Notifications Page với Suspense cho streaming
 * 
 * Theo Next.js 16 best practices:
 * - Header render ngay, table content stream khi ready
 * 
 * Page này hiển thị thông báo:
 * - Super Admin: Xem tất cả thông báo trong hệ thống
 * - Các roles khác: Chỉ xem thông báo của chính họ
 */
async function NotificationsTableContent() {
  const { permissions, roles, actorId, isSuperAdminUser } = await getAuthInfo()
  
  // Nếu không phải super admin, chỉ xem notifications của chính họ
  const userId = isSuperAdminUser ? undefined : actorId

  // Check permissions cho UI actions
  const canManage = canPerformAction(permissions, roles, PERMISSIONS.NOTIFICATIONS_MANAGE)

  return (
    <NotificationsTable canManage={canManage} userId={userId} isSuperAdmin={isSuperAdminUser} />
  )
}

export default async function NotificationsPage() {
  return (
    <>
      <AdminHeader
        breadcrumbs={[
          { label: "Thông báo", isActive: true },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <TablePageSuspense columnCount={5} rowCount={10}>
          <NotificationsTableContent />
        </TablePageSuspense>
      </div>
    </>
  )
}

