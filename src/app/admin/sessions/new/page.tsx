import type { Metadata } from "next"
import { AdminHeader } from "@/components/headers"
import { SessionCreate } from "@/features/admin/sessions/components/session-create"
import { FormPageSuspense } from "@/features/admin/resources/components"

/**
 * Session Create Page Metadata
 * 
 * Theo Next.js 16 best practices:
 * - Metadata được merge với admin layout và root layout
 * - Title sử dụng template từ root: "Tạo session | CMS"
 */
export const metadata: Metadata = {
  title: "Tạo session",
  description: "Tạo session mới",
}

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

