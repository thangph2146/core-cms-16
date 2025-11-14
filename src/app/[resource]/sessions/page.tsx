import type { Metadata } from "next"
import { AdminHeader } from "@/components/headers"
import { PERMISSIONS } from "@/lib/permissions"
import { getTablePermissionsAsync } from "@/features/admin/resources/server"
import { SessionsTable } from "@/features/admin/sessions/components/sessions-table"
import { TablePageSuspense } from "@/features/admin/resources/components"

/**
 * Sessions Page Metadata
 * 
 * Theo Next.js 16 best practices:
 * - Metadata được merge với admin layout và root layout
 * - Title sử dụng template từ root: "Session | CMS"
 */
export const metadata: Metadata = {
  title: "Session",
  description: "Quản lý phiên đăng nhập",
}

/**
 * Sessions Page với Suspense cho streaming
 * 
 * Theo Next.js 16 best practices:
 * - Header render ngay, table content stream khi ready
 * - SessionsTable component sử dụng Promise.all để fetch sessionsData và usersOptions song song
 */
async function SessionsTableContent() {
  const { canDelete, canRestore, canManage, canCreate } = await getTablePermissionsAsync({
    delete: [PERMISSIONS.SESSIONS_DELETE, PERMISSIONS.SESSIONS_MANAGE],
    restore: [PERMISSIONS.SESSIONS_UPDATE, PERMISSIONS.SESSIONS_MANAGE],
    manage: PERMISSIONS.SESSIONS_MANAGE,
    create: PERMISSIONS.SESSIONS_CREATE,
  })

  return (
    <SessionsTable
      canDelete={canDelete}
      canRestore={canRestore}
      canManage={canManage}
      canCreate={canCreate}
    />
  )
}

export default async function SessionsPage() {
  return (
    <>
      <AdminHeader
        breadcrumbs={[
          { label: "Session", isActive: true },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <TablePageSuspense columnCount={5} rowCount={10}>
          <SessionsTableContent />
        </TablePageSuspense>
      </div>
    </>
  )
}

