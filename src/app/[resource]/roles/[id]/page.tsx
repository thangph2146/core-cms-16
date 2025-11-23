import type { Metadata } from "next"
import { AdminHeader } from "@/components/layouts/headers"
import { RoleDetail } from "@/features/admin/roles/components/role-detail"
import { validateRouteId } from "@/lib/validation/route-params"
import { FormPageSuspense } from "@/features/admin/resources/components"
import { getRoleById } from "@/features/admin/roles/server/queries"
import { truncateBreadcrumbLabel } from "@/features/admin/resources/utils"

/**
 * Role Detail Page Metadata (Dynamic)
 * 
 * Theo Next.js 16 best practices:
 * - Sử dụng generateMetadata để tạo metadata động dựa trên role data
 * - Metadata được merge với admin layout và root layout
 * - Title sử dụng template từ root: "{Role Name} | CMS"
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const role = await getRoleById(id)

  if (!role) {
    return {
      title: "Không tìm thấy",
      description: "Vai trò không tồn tại",
    }
  }

  return {
    title: role.displayName || role.name || "Chi tiết vai trò",
    description: role.description || `Chi tiết vai trò: ${role.displayName || role.name}`,
  }
}

/**
 * Role Detail Page với Suspense cho streaming
 * 
 * Theo Next.js 16 best practices:
 * - Header render ngay, detail content stream khi ready
 */
async function RoleDetailContent({ roleId }: { roleId: string }) {
  return <RoleDetail roleId={roleId} backUrl="/admin/roles" />
}

export default async function RoleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  
  // Fetch role data (non-cached) để hiển thị tên trong breadcrumb
  // Theo chuẩn Next.js 16: không cache admin data
  const role = await getRoleById(id)
  const roleName = truncateBreadcrumbLabel(role?.displayName || role?.name || "Chi tiết")
  
  // Validate route ID
  const validatedId = validateRouteId(id, "Vai trò")
  if (!validatedId) {
    return (
      <>
        <AdminHeader
          breadcrumbs={[
            { label: "Vai trò", href: "/admin/roles" },
            { label: roleName, href: `/admin/roles/${id}` },
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
          { label: roleName, isActive: true },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <FormPageSuspense fieldCount={6} sectionCount={2}>
          <RoleDetailContent roleId={validatedId} />
        </FormPageSuspense>
      </div>
    </>
  )
}

