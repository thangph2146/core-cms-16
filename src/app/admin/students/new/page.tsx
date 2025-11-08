import type { Metadata } from "next"
import { AdminHeader } from "@/components/headers"
import { StudentCreate } from "@/features/admin/students/components/student-create"
import { FormPageSuspense } from "@/features/admin/resources/components"

/**
 * Student Create Page Metadata
 * 
 * Theo Next.js 16 best practices:
 * - Metadata được merge với admin layout và root layout
 * - Title sử dụng template từ root: "Tạo học sinh | CMS"
 */
export const metadata: Metadata = {
  title: "Tạo học sinh",
  description: "Tạo học sinh mới",
}

/**
 * Student Create Page với Suspense cho streaming
 * 
 * Theo Next.js 16 best practices:
 * - Header render ngay, form content stream khi ready
 */
async function StudentCreateContent() {
  return <StudentCreate />
}

export default async function StudentCreatePage() {
  return (
    <>
      <AdminHeader
        breadcrumbs={[
          { label: "Học sinh", href: "/admin/students" },
          { label: "Tạo mới", isActive: true },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <FormPageSuspense fieldCount={8} sectionCount={2}>
          <StudentCreateContent />
        </FormPageSuspense>
      </div>
    </>
  )
}

