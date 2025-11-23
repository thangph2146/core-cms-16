import type { Metadata } from "next"
import { AdminHeader } from "@/components/layouts/headers"
import { PERMISSIONS } from "@/lib/permissions"
import { getTablePermissionsAsync } from "@/features/admin/resources/server"
import { PostsTable } from "@/features/admin/posts/components/posts-table"
import { TablePageSuspense } from "@/features/admin/resources/components"
import { createListBreadcrumbs } from "@/features/admin/resources/utils"

/**
 * Posts Page Metadata
 * 
 * Theo Next.js 16 best practices:
 * - Metadata được merge với admin layout và root layout
 * - Title sử dụng template từ root: "Bài viết | CMS"
 */
export const metadata: Metadata = {
  title: "Bài viết",
  description: "Quản lý bài viết",
}

/**
 * Posts Page với Suspense cho streaming
 * 
 * Theo Next.js 16 best practices về Multiple Suspense Boundaries:
 * - Tách permissions và data fetching thành separate async components
 * - Sử dụng multiple Suspense boundaries để stream song song
 * - Header render ngay, permissions và table content stream độc lập
 */
async function PostsTableWithPermissions() {
  // Fetch permissions
  const permissions = await getTablePermissionsAsync({
    delete: [PERMISSIONS.POSTS_DELETE, PERMISSIONS.POSTS_MANAGE],
    restore: [PERMISSIONS.POSTS_UPDATE, PERMISSIONS.POSTS_MANAGE],
    manage: PERMISSIONS.POSTS_MANAGE,
    create: PERMISSIONS.POSTS_CREATE,
  })

  return (
    <PostsTable
      canDelete={permissions.canDelete}
      canRestore={permissions.canRestore}
      canManage={permissions.canManage}
      canCreate={permissions.canCreate}
    />
  )
}

export default async function PostsPage() {
  return (
    <>
      <AdminHeader breadcrumbs={createListBreadcrumbs({ listLabel: "Bài viết" })} />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <TablePageSuspense columnCount={6} rowCount={10}>
          <PostsTableWithPermissions />
        </TablePageSuspense>
      </div>
    </>
  )
}

