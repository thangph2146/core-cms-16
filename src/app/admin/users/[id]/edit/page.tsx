import { AdminHeader } from "@/components/headers"
import { UserEdit } from "@/features/admin/users/components/user-edit"
import { getUserDetailById } from "@/features/admin/users/server/cache"

/**
 * User Edit Page
 * 
 * Permission checking cho page access đã được xử lý ở layout level (PermissionGate)
 * Route này yêu cầu USERS_UPDATE permission (được map trong route-permissions.ts)
 */
export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await getUserDetailById(id)

  if (!user) {
    return (
      <>
        <AdminHeader
          breadcrumbs={[
            { label: "Users", href: "/admin/users" },
            { label: "Chi tiết", href: `/admin/users/${id}` },
            { label: "Chỉnh sửa", isActive: true },
          ]}
        />
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex min-h-[400px] flex-1 items-center justify-center">
            <div className="text-center">
              <h2 className="mb-2 text-2xl font-bold">Không tìm thấy người dùng</h2>
              <p className="text-muted-foreground">
                Người dùng bạn đang tìm kiếm không tồn tại.
              </p>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <AdminHeader
        breadcrumbs={[
          { label: "Users", href: "/admin/users" },
          { label: "Chi tiết", href: `/admin/users/${id}` },
          { label: "Chỉnh sửa", isActive: true },
        ]}
      />
      <div className="flex flex-1 flex-col">
        <UserEdit
          userId={id}
          variant="page"
          backUrl={`/admin/users/${id}`}
          backLabel="Quay lại chi tiết"
        />
      </div>
    </>
  )
}
