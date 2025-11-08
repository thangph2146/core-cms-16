import { AdminHeader } from "@/components/headers"
import { RoleDetail } from "@/features/admin/roles/components/role-detail"
import { validateRouteId } from "@/lib/validation/route-params"
import { FormPageSuspense } from "@/features/admin/resources/components"

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
  
  // Validate route ID
  const validatedId = validateRouteId(id, "Vai trò")
  if (!validatedId) {
    return (
      <>
        <AdminHeader
          breadcrumbs={[
            { label: "Vai trò", href: "/admin/roles" },
            { label: "Chi tiết", href: `/admin/roles/${id}` },
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
          { label: "Chi tiết", isActive: true },
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

