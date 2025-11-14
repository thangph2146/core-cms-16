import type { Metadata } from "next"
import { AdminHeader } from "@/components/headers"
import { RoleEdit } from "@/features/admin/roles/components/role-edit"
import { validateRouteId } from "@/lib/validation/route-params"
import { FormPageSuspense } from "@/features/admin/resources/components"
import { getRoleDetailById } from "@/features/admin/roles/server/cache"

/**
 * Role Edit Page Metadata (Dynamic)
 * 
 * Theo Next.js 16 best practices:
 * - Sử dụng generateMetadata để tạo metadata động dựa trên role data
 * - Metadata được merge với admin layout và root layout
 * - Title sử dụng template từ root: "Chỉnh sửa {Role Name} | CMS"
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const role = await getRoleDetailById(id)

  if (!role) {
    return {
      title: "Không tìm thấy",
      description: "Vai trò không tồn tại",
    }
  }

  return {
    title: `Chỉnh sửa ${role.displayName || role.name || "vai trò"}`,
    description: `Chỉnh sửa thông tin vai trò: ${role.displayName || role.name}`,
  }
}

/**
 * Role Edit Page với Suspense cho streaming
 * 
 * Theo Next.js 16 best practices:
 * - Header render ngay, form content stream khi ready
 */
async function RoleEditContent({ roleId }: { roleId: string }) {
  return <RoleEdit roleId={roleId} variant="page" backUrl={`/admin/roles/${roleId}`} />
}

export default async function RoleEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  
  // Validate route ID
  const validatedId = validateRouteId(id, "Vai trò")
  if (!validatedId) {
    return (
      <>
        <AdminHeader
          breadcrumbs={[
            { label: "Vai trò", href: "/admin/roles" },
            { label: "Chỉnh sửa", href: `/admin/roles/${id}/edit` },
          ]}
        />
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex min-h-[400px] flex-1 items-center justify-center">
            <div className="text-center">
              <h2 className="mb-2 text-2xl font-bold">ID không hợp lệ</h2>
              <p className="text-muted-foreground">
                ID vai trò không hợp lệ.
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
          { label: "Vai trò", href: "/admin/roles" },
          { label: "Chỉnh sửa", isActive: true },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <FormPageSuspense fieldCount={6} sectionCount={2}>
          <RoleEditContent roleId={validatedId} />
        </FormPageSuspense>
      </div>
    </>
  )
}

