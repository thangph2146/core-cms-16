import type { Metadata } from "next"
import { AdminHeader } from "@/components/layouts/headers"
import { PERMISSIONS } from "@/lib/permissions"
import { getTablePermissionsAsync } from "@/features/admin/resources/server"
import { CategoriesTable } from "@/features/admin/categories/components/categories-table"
import { TablePageSuspense } from "@/features/admin/resources/components"
import { createListBreadcrumbs } from "@/features/admin/resources/utils"

/**
 * Categories Page Metadata
 * 
 * Theo Next.js 16 best practices:
 * - Metadata được merge với admin layout và root layout
 * - Title sử dụng template từ root: "Danh mục | CMS"
 */
export const metadata: Metadata = {
  title: "Danh mục",
  description: "Quản lý danh mục nội dung",
}

/**
 * Categories Page với Suspense cho streaming
 * 
 * Theo Next.js 16 best practices:
 * - Header render ngay, table content stream khi ready
 */
async function CategoriesTableWithPermissions() {
  const permissions = await getTablePermissionsAsync({
    delete: [PERMISSIONS.CATEGORIES_DELETE, PERMISSIONS.CATEGORIES_MANAGE],
    restore: [PERMISSIONS.CATEGORIES_UPDATE, PERMISSIONS.CATEGORIES_MANAGE],
    manage: PERMISSIONS.CATEGORIES_MANAGE,
    create: PERMISSIONS.CATEGORIES_CREATE,
  })

  return (
    <CategoriesTable
      canDelete={permissions.canDelete}
      canRestore={permissions.canRestore}
      canManage={permissions.canManage}
      canCreate={permissions.canCreate}
    />
  )
}

export default async function CategoriesPage() {
  return (
    <>
      <AdminHeader breadcrumbs={createListBreadcrumbs({ listLabel: "Danh mục" })} />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <TablePageSuspense columnCount={4} rowCount={10}>
          <CategoriesTableWithPermissions />
        </TablePageSuspense>
      </div>
    </>
  )
}

