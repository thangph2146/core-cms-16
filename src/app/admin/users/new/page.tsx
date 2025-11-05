import { AdminHeader } from "@/components/headers"
import { UserCreate } from "@/features/admin/users/components/user-create"
import { getRolesCached } from "@/features/admin/users/server/queries"

/**
 * User Create Page
 * 
 * Permission checking cho page access đã được xử lý ở layout level (PermissionGate)
 * Route này yêu cầu USERS_CREATE permission (được map trong route-permissions.ts)
 */
export default async function UserCreatePage() {
  const roles = await getRolesCached()

  return (
    <>
      <AdminHeader
        breadcrumbs={[
          { label: "Users", href: "/admin/users" },
          { label: "Tạo mới", isActive: true },
        ]}
      />
      <div className="flex flex-1 flex-col">
        <UserCreate backUrl="/admin/users" roles={roles} />
      </div>
    </>
  )
}

