import { AdminHeader } from "@/components/headers"
import { UserDetail } from "@/features/admin/users/components/user-detail"

/**
 * User Detail Page (Server Component)
 * 
 * Permission checking cho page access đã được xử lý ở layout level (PermissionGate)
 * Route này yêu cầu USERS_VIEW permission (được map trong route-permissions.ts)
 * 
 * Pattern: Page fetches data -> UserDetail (server) -> UserDetailClient (client)
 */
export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <>
      <AdminHeader
        breadcrumbs={[
          { label: "Users", href: "/admin/users" },
          { label: "Chi tiết", isActive: true },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        {/* UserDetail là server component, tự fetch data và render client component */}
        <UserDetail userId={id} backUrl="/admin/users" />
      </div>
    </>
  )
}

