import type { Metadata } from "next"
import { AdminHeader } from "@/components/layouts/headers"
import { UserEdit } from "@/features/admin/users/components/user-edit"
import { validateRouteId } from "@/lib/validation/route-params"
import { FormPageSuspense } from "@/features/admin/resources/components"
import { getUserDetailById } from "@/features/admin/users/server/cache"

/**
 * User Edit Page Metadata (Dynamic)
 * 
 * Theo Next.js 16 best practices:
 * - Sử dụng generateMetadata để tạo metadata động dựa trên user data
 * - Metadata được merge với admin layout và root layout
 * - Title sử dụng template từ root: "Chỉnh sửa {User Name} | CMS"
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const user = await getUserDetailById(id)

  if (!user) {
    return {
      title: "Không tìm thấy",
      description: "Người dùng không tồn tại",
    }
  }

  return {
    title: `Chỉnh sửa ${user.name || user.email || "người dùng"}`,
    description: `Chỉnh sửa thông tin người dùng: ${user.name || user.email}`,
  }
}

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
  
  // Fetch user data từ cache để hiển thị tên trong breadcrumb
  const user = await getUserDetailById(id)
  const userName = user?.name || user?.email || "Chi tiết"
  
  // Validate route ID
  const validatedId = validateRouteId(id, "Người dùng")
  if (!validatedId) {
    return (
      <>
        <AdminHeader
          breadcrumbs={[
            { label: "Users", href: "/admin/users" },
            { label: userName, href: `/admin/users/${id}` },
            { label: "Chỉnh sửa", href: `/admin/users/${id}/edit` },
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
          { label: userName, href: `/admin/users/${id}` },
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
