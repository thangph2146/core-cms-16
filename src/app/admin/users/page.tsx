import { AdminHeader } from "@/components/headers"
import { PERMISSIONS } from "@/lib/permissions"
import { canPerformAction, canPerformAnyAction } from "@/lib/permissions-helpers"
import { getPermissions, getSession } from "@/lib/api/auth-server"

import { UsersTable } from "@/features/users/components/users-table"

interface SessionWithMeta {
  roles?: Array<{ name: string }>
  permissions?: Array<string>
}

function ForbiddenNotice() {
  return (
    <>
      <AdminHeader
        breadcrumbs={[
          { label: "Users", isActive: true },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4 max-w[100vw - 20px]">
        <div className="flex min-h-[400px] flex-1 items-center justify-center">
          <div className="text-center">
            <h2 className="mb-2 text-2xl font-bold">Không có quyền truy cập</h2>
            <p className="text-muted-foreground">
              Bạn không có quyền xem trang này.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}


export default async function UsersPage() {
  const session = (await getSession()) as SessionWithMeta | null
  const permissions = await getPermissions()
  const roles = session?.roles ?? []

  // Check if user can view users
  const canView = canPerformAction(
    permissions,
    roles,
    PERMISSIONS.USERS_VIEW
  )

  const canDelete = canPerformAnyAction(permissions, roles, [
    PERMISSIONS.USERS_DELETE,
    PERMISSIONS.USERS_MANAGE,
  ])
  const canRestore = canPerformAnyAction(permissions, roles, [
    PERMISSIONS.USERS_UPDATE,
    PERMISSIONS.USERS_MANAGE,
  ])
  const canManage = canPerformAction(permissions, roles, PERMISSIONS.USERS_MANAGE)

  if (!canView) {
    return <ForbiddenNotice />
  }

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
        />
      </div>
    </>
  )
}
