import { AdminHeader } from "@/components/admin-header"
import { UsersTable } from "@/features/users/components/users-table"
import { PERMISSIONS } from "@/lib/permissions"
import { canPerformAction, canPerformAnyAction } from "@/lib/permissions-helpers"
import { getPermissions, getSession } from "@/lib/api/auth-server"

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
      <div className="flex flex-1 flex-col gap-4 p-4">
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

function UsersTableFallback() {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
      <span>Đang tải danh sách người dùng...</span>
    </div>
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
          />
      </div>
    </>
  )
}
