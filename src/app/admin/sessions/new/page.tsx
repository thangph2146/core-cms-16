import { AdminHeader } from "@/components/headers"
import { SessionCreate } from "@/features/admin/sessions/components/session-create"
import { FormPageSuspense } from "@/features/admin/resources/components"

/**
 * Session Create Page với Suspense cho streaming
 * 
 * Theo Next.js 16 best practices:
 * - Header render ngay, form content stream khi ready
 */
async function SessionCreateContent() {
  return <SessionCreate backUrl="/admin/sessions" />
}

export default async function SessionCreatePage() {
  return (
    <>
      <AdminHeader
        breadcrumbs={[
          { label: "Session", href: "/admin/sessions" },
          { label: "Tạo mới", isActive: true },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <FormPageSuspense fieldCount={6} sectionCount={1}>
          <SessionCreateContent />
        </FormPageSuspense>
      </div>
    </>
  )
}

