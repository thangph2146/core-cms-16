import { AdminHeader } from "@/components/headers"
import { PERMISSIONS, canPerformAction, canPerformAnyAction } from "@/lib/permissions"
import { getPermissions, getSession } from "@/lib/auth/auth-server"

import { TagsTable } from "@/features/admin/tags/components/tags-table"

interface SessionWithMeta {
  roles?: Array<{ name: string }>
  permissions?: Array<string>
}

/**
 * Tags Page
 * 
 * Permission checking cho page access đã được xử lý ở layout level (PermissionGate)
 * Chỉ cần check permissions cho UI actions (canDelete, canRestore, canManage, canCreate)
 */
export default async function TagsPage() {
  const session = (await getSession()) as SessionWithMeta | null
  const permissions = await getPermissions()
  const roles = session?.roles ?? []

  // Check permissions cho UI actions (không phải page access)
  const canDelete = canPerformAnyAction(permissions, roles, [
    PERMISSIONS.TAGS_DELETE,
    PERMISSIONS.TAGS_MANAGE,
  ])
  const canRestore = canPerformAnyAction(permissions, roles, [
    PERMISSIONS.TAGS_UPDATE,
    PERMISSIONS.TAGS_MANAGE,
  ])
  const canManage = canPerformAction(permissions, roles, PERMISSIONS.TAGS_MANAGE)
  const canCreate = canPerformAction(permissions, roles, PERMISSIONS.TAGS_CREATE)

  return (
    <>
      <AdminHeader
        breadcrumbs={[
          { label: "Thẻ tag", isActive: true },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <TagsTable
          canDelete={canDelete}
          canRestore={canRestore}
          canManage={canManage}
          canCreate={canCreate}
        />
      </div>
    </>
  )
}

