import { AdminHeader } from "@/components/headers"
import { UserEdit } from "@/features/admin/users/components/user-edit"
import { validateRouteId } from "@/lib/validation/route-params"
import { FormPageSuspense } from "@/features/admin/resources/components"

/**
 * User Edit Page với Suspense cho streaming
 * 
 * Theo Next.js 16 best practices:
 * - Header render ngay, form content stream khi ready
 * - UserEdit component sử dụng Promise.all để fetch user và roles song song
 */
async function UserEditContent({ userId }: { userId: string }) {
  return (
    <UserEdit
      userId={userId}
      variant="page"
      backUrl={`/admin/users/${userId}`}
      backLabel="Quay lại chi tiết"
    />
  )
}

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  
  // Validate route ID
  const validatedId = validateRouteId(id, "Người dùng")
  if (!validatedId) {
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
              <h2 className="mb-2 text-2xl font-bold">ID không hợp lệ</h2>
              <p className="text-muted-foreground">
                ID người dùng không hợp lệ.
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
      <div className="flex flex-1 flex-col gap-4 p-4">
        <FormPageSuspense fieldCount={8} sectionCount={2}>
          <UserEditContent userId={validatedId} />
        </FormPageSuspense>
      </div>
    </>
  )
}
