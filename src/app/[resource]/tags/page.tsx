import type { Metadata } from "next"
import { AdminHeader } from "@/components/headers"
import { PERMISSIONS } from "@/lib/permissions"
import { getTablePermissionsAsync } from "@/features/admin/resources/server"
import { TagsTable } from "@/features/admin/tags/components/tags-table"
import { TablePageSuspense } from "@/features/admin/resources/components"

/**
 * Tags Page Metadata
 * 
 * Theo Next.js 16 best practices:
 * - Metadata được merge với admin layout và root layout
 * - Title sử dụng template từ root: "Thẻ tag | CMS"
 */
export const metadata: Metadata = {
  title: "Thẻ tag",
  description: "Quản lý thẻ tag nội dung",
}

/**
 * Tags Page với Suspense cho streaming
 * 
 * Theo Next.js 16 best practices:
 * - Header render ngay, table content stream khi ready
 */
async function TagsTableContent() {
  const { canDelete, canRestore, canManage, canCreate } = await getTablePermissionsAsync({
    delete: [PERMISSIONS.TAGS_DELETE, PERMISSIONS.TAGS_MANAGE],
    restore: [PERMISSIONS.TAGS_UPDATE, PERMISSIONS.TAGS_MANAGE],
    manage: PERMISSIONS.TAGS_MANAGE,
    create: PERMISSIONS.TAGS_CREATE,
  })

  return (
    <TagsTable
      canDelete={canDelete}
      canRestore={canRestore}
      canManage={canManage}
      canCreate={canCreate}
    />
  )
}

export default async function TagsPage() {
  return (
    <>
      <AdminHeader
        breadcrumbs={[
          { label: "Thẻ tag", isActive: true },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <TablePageSuspense columnCount={4} rowCount={10}>
          <TagsTableContent />
        </TablePageSuspense>
      </div>
    </>
  )
}

