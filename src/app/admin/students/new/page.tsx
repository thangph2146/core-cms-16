import { AdminHeader } from "@/components/headers"
import { StudentCreate } from "@/features/admin/students/components/student-create"
import { FormPageSuspense } from "@/features/admin/resources/components"

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

