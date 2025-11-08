import type { Metadata } from "next"
import { AdminHeader } from "@/components/headers"
import { TagCreate } from "@/features/admin/tags/components/tag-create"
import { FormPageSuspense } from "@/features/admin/resources/components"

/**
 * Tag Create Page Metadata
 * 
 * Theo Next.js 16 best practices:
 * - Metadata được merge với admin layout và root layout
 * - Title sử dụng template từ root: "Tạo thẻ tag | CMS"
 */
export const metadata: Metadata = {
  title: "Tạo thẻ tag",
  description: "Tạo thẻ tag mới",
}

/**
 * Tag Create Page với Suspense cho streaming
 * 
 * Theo Next.js 16 best practices:
 * - Header render ngay, form content stream khi ready
 */
async function TagCreateContent() {
  return <TagCreate />
}

export default async function TagCreatePage() {
  return (
    <>
      <AdminHeader
        breadcrumbs={[
          { label: "Thẻ tag", href: "/admin/tags" },
          { label: "Tạo mới", isActive: true },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <FormPageSuspense fieldCount={6} sectionCount={1}>
          <TagCreateContent />
        </FormPageSuspense>
      </div>
    </>
  )
}

