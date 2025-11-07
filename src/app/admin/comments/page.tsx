import { AdminHeader } from "@/components/headers"
import { PERMISSIONS, canPerformAction, canPerformAnyAction } from "@/lib/permissions"
import { getPermissions, getSession } from "@/lib/auth/auth-server"

import { CommentsTable } from "@/features/admin/comments/components/comments-table"

interface SessionWithMeta {
  roles?: Array<{ name: string }>
  permissions?: Array<string>
}

/**
 * Comments Page
 * 
 * Permission checking cho page access đã được xử lý ở layout level (PermissionGate)
 * Chỉ cần check permissions cho UI actions (canDelete, canRestore, canManage, canApprove)
 */
export default async function CommentsPage() {
  const session = (await getSession()) as SessionWithMeta | null
  const permissions = await getPermissions()
  const roles = session?.roles ?? []

  // Check permissions cho UI actions (không phải page access)
  const canDelete = canPerformAnyAction(permissions, roles, [
    PERMISSIONS.COMMENTS_DELETE,
    PERMISSIONS.COMMENTS_MANAGE,
  ])
  const canRestore = canPerformAnyAction(permissions, roles, [
    PERMISSIONS.COMMENTS_MANAGE,
  ])
  const canManage = canPerformAction(permissions, roles, PERMISSIONS.COMMENTS_MANAGE)
  const canApprove = canPerformAction(permissions, roles, PERMISSIONS.COMMENTS_APPROVE)

  return (
    <>
      <AdminHeader
        breadcrumbs={[
          { label: "Bình luận", isActive: true },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <CommentsTable
          canDelete={canDelete}
          canRestore={canRestore}
          canManage={canManage}
          canApprove={canApprove}
        />
      </div>
    </>
  )
}

