import type { Metadata } from "next"
import { AdminHeader } from "@/components/headers"
import { PERMISSIONS, canPerformAction, canPerformAnyAction } from "@/lib/permissions"
import { getAuthInfo } from "@/features/admin/resources/server"
import { StudentsTable } from "@/features/admin/students/components/students-table"
import { TablePageSuspense } from "@/features/admin/resources/components"

/**
 * Students Page Metadata
 * 
 * Theo Next.js 16 best practices:
 * - Metadata được merge với admin layout và root layout
 * - Title sử dụng template từ root: "Học sinh | CMS"
 */
export const metadata: Metadata = {
  title: "Học sinh",
  description: "Quản lý học sinh",
}

/**
 * Students Page với Suspense cho streaming
 * 
 * Theo Next.js 16 best practices:
 * - Header render ngay, table content stream khi ready
 */
async function StudentsTableContent() {
  const { permissions, roles, actorId, isSuperAdminUser } = await getAuthInfo()

  // Check permissions cho UI actions (không phải page access)
  const canDelete = canPerformAnyAction(permissions, roles, [
    PERMISSIONS.STUDENTS_DELETE,
    PERMISSIONS.STUDENTS_MANAGE,
  ])
  const canRestore = canPerformAnyAction(permissions, roles, [
    PERMISSIONS.STUDENTS_UPDATE,
    PERMISSIONS.STUDENTS_MANAGE,
  ])
  const canManage = canPerformAction(permissions, roles, PERMISSIONS.STUDENTS_MANAGE)
  const canCreate = canPerformAction(permissions, roles, PERMISSIONS.STUDENTS_CREATE)

  return (
    <StudentsTable
      canDelete={canDelete}
      canRestore={canRestore}
      canManage={canManage}
      canCreate={canCreate}
      actorId={actorId}
      isSuperAdmin={isSuperAdminUser}
    />
  )
}

export default async function StudentsPage() {
  return (
    <>
      <AdminHeader
        breadcrumbs={[
          { label: "Học sinh", isActive: true },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <TablePageSuspense columnCount={5} rowCount={10}>
          <StudentsTableContent />
        </TablePageSuspense>
      </div>
    </>
  )
}

