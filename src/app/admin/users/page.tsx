import { AdminHeader } from "@/components/headers"
import { PERMISSIONS, canPerformAction, canPerformAnyAction } from "@/lib/permissions"
import { getPermissions, getSession } from "@/lib/auth/auth-server"

import { UsersTable } from "@/features/admin/users/components/users-table"

interface SessionWithMeta {
  roles?: Array<{ name: string }>
  permissions?: Array<string>
}

/**
 * Users Page
 * 
 * Permission checking cho page access đã được xử lý ở layout level (PermissionGate)
 * Chỉ cần check permissions cho UI actions (canDelete, canRestore, canManage, canCreate)
 */
export default async function UsersPage() {
  const session = (await getSession()) as SessionWithMeta | null
  const permissions = await getPermissions()
  const roles = session?.roles ?? []

  // Check permissions cho UI actions (không phải page access)
  const canDelete = canPerformAnyAction(permissions, roles, [
    PERMISSIONS.USERS_DELETE,
    PERMISSIONS.USERS_MANAGE,
  ])
  const canRestore = canPerformAnyAction(permissions, roles, [
    PERMISSIONS.USERS_UPDATE,
    PERMISSIONS.USERS_MANAGE,
  ])
  const canManage = canPerformAction(permissions, roles, PERMISSIONS.USERS_MANAGE)
  const canCreate = canPerformAction(permissions, roles, PERMISSIONS.USERS_CREATE)

  return (
    <>
      <AdminHeader
        breadcrumbs={[
          { label: "Users", isActive: true },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <UsersTable
          canDelete={canDelete}
          canRestore={canRestore}
          canManage={canManage}
          canCreate={canCreate}
        />
      </div>
    </>
  )
}
