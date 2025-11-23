import type { Metadata } from "next"
import { AdminHeader } from "@/components/layouts/headers"
import { PERMISSIONS, type Permission } from "@/lib/permissions"
import { getTablePermissionsAsync } from "@/features/admin/resources/server"
import { UsersTable } from "@/features/admin/users/components/users-table"
import { TablePageSuspense } from "@/features/admin/resources/components"
import { createListBreadcrumbs } from "@/features/admin/resources/utils"

/**
 * Users Page Metadata
 * 
 * Theo Next.js 16 best practices:
 * - Metadata được merge với admin layout và root layout
 * - Title sử dụng template từ root: "Người dùng | CMS"
 */
export const metadata: Metadata = {
  title: "Người dùng",
  description: "Quản lý người dùng hệ thống",
}

/**
 * Users Page với Suspense cho streaming
 * 
 * Theo Next.js 16 best practices về Multiple Suspense Boundaries:
 * - Tách permissions và data fetching thành separate async components
 * - Sử dụng multiple Suspense boundaries để stream song song
 * - Header render ngay, permissions và table content stream độc lập
 * 
 * Benefits:
 * - Permissions có thể stream trước khi data ready
 * - Table có thể render với permissions đã có
 * - Better perceived performance với progressive loading
 * - UsersTable component đã có internal Suspense boundaries cho data fetching
 */
async function UsersTableWithPermissions() {
  // Fetch permissions
  const permissions = await getTablePermissionsAsync({
    delete: [PERMISSIONS.USERS_DELETE, PERMISSIONS.USERS_MANAGE],
    restore: [PERMISSIONS.USERS_UPDATE, PERMISSIONS.USERS_MANAGE],
    manage: [PERMISSIONS.USERS_UPDATE, PERMISSIONS.USERS_MANAGE] as Permission[],
    create: PERMISSIONS.USERS_CREATE,
  })

  return (
    <UsersTable
      canDelete={permissions.canDelete}
      canRestore={permissions.canRestore}
      canManage={permissions.canManage}
      canCreate={permissions.canCreate}
    />
  )
}

export default async function UsersPage() {
  return (
    <>
      <AdminHeader breadcrumbs={createListBreadcrumbs({ listLabel: "Users" })} />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <TablePageSuspense columnCount={6} rowCount={10}>
          <UsersTableWithPermissions />
        </TablePageSuspense>
      </div>
    </>
  )
}
