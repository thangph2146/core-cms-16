import { AdminHeader } from "@/components/headers"
import { UserCreate } from "@/features/admin/users/components/user-create"
import { FormPageSuspense } from "@/features/admin/resources/components"

/**
 * User Create Page với Suspense cho streaming
 * 
 * Theo Next.js 16 best practices:
 * - Header render ngay, form content stream khi ready
 * - UserCreate component fetch roles data bên trong
 */
async function UserCreateContent() {
  return <UserCreate backUrl="/admin/users" />
}

export default async function UserCreatePage() {
  return (
    <>
      <AdminHeader
        breadcrumbs={[
          { label: "Users", href: "/admin/users" },
          { label: "Tạo mới", isActive: true },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <FormPageSuspense fieldCount={8} sectionCount={2}>
          <UserCreateContent />
        </FormPageSuspense>
      </div>
    </>
  )
}

