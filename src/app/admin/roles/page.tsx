import type { Metadata } from "next"
import { AdminHeader } from "@/components/headers"
import { PERMISSIONS } from "@/lib/permissions"
import { getTablePermissionsAsync } from "@/features/admin/resources/server"
import { RolesTable } from "@/features/admin/roles/components/roles-table"
import { TablePageSuspense } from "@/features/admin/resources/components"

/**
 * Roles Page Metadata
 * 
 * Theo Next.js 16 best practices:
 * - Metadata được merge với admin layout và root layout
 * - Title sử dụng template từ root: "Vai trò | CMS"
 */
export const metadata: Metadata = {
  title: "Vai trò",
  description: "Quản lý vai trò và quyền hạn",
}

/**
 * Roles Page với Suspense cho streaming
 * 
 * Theo Next.js 16 best practices:
 * - Header render ngay, table content stream khi ready
 */
async function RolesTableContent() {
  const { canDelete, canRestore, canManage, canCreate } = await getTablePermissionsAsync({
    delete: [PERMISSIONS.ROLES_DELETE, PERMISSIONS.ROLES_MANAGE],
    restore: [PERMISSIONS.ROLES_UPDATE, PERMISSIONS.ROLES_MANAGE],
    manage: PERMISSIONS.ROLES_MANAGE,
    create: PERMISSIONS.ROLES_CREATE,
  })

  return (
    <RolesTable
      canDelete={canDelete}
      canRestore={canRestore}
      canManage={canManage}
      canCreate={canCreate}
    />
  )
}

export default async function RolesPage() {
  return (
    <>
      <AdminHeader
        breadcrumbs={[
          { label: "Vai trò", isActive: true },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <TablePageSuspense columnCount={4} rowCount={10}>
          <RolesTableContent />
        </TablePageSuspense>
      </div>
    </>
  )
}

