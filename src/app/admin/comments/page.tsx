import { AdminHeader } from "@/components/headers"
import { PERMISSIONS, canPerformAction } from "@/lib/permissions"
import { getAuthInfo } from "@/features/admin/resources/server"
import { CommentsTable } from "@/features/admin/comments/components/comments-table"
import { TablePageSuspense } from "@/features/admin/resources/components"

/**
 * Comments Page với Suspense cho streaming
 * 
 * Theo Next.js 16 best practices:
 * - Header render ngay, table content stream khi ready
 */
async function CommentsTableContent() {
  const { permissions, roles } = await getAuthInfo()

  // Check permissions cho UI actions (không phải page access)
  const canDelete = canPerformAction(permissions, roles, PERMISSIONS.COMMENTS_MANAGE)
  const canRestore = canPerformAction(permissions, roles, PERMISSIONS.COMMENTS_MANAGE)
  const canManage = canPerformAction(permissions, roles, PERMISSIONS.COMMENTS_MANAGE)
  const canApprove = canPerformAction(permissions, roles, PERMISSIONS.COMMENTS_APPROVE)

  return (
    <CommentsTable
      canDelete={canDelete}
      canRestore={canRestore}
      canManage={canManage}
      canApprove={canApprove}
    />
  )
}

export default async function CommentsPage() {
  return (
    <>
      <AdminHeader
        breadcrumbs={[
          { label: "Bình luận", isActive: true },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <TablePageSuspense columnCount={6} rowCount={10}>
          <CommentsTableContent />
        </TablePageSuspense>
      </div>
    </>
  )
}

