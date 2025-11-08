import { AdminHeader } from "@/components/headers"
import { StudentEdit } from "@/features/admin/students/components/student-edit"
import { validateRouteId } from "@/lib/validation/route-params"
import { FormPageSuspense } from "@/features/admin/resources/components"

interface StudentEditPageProps {
  params: Promise<{ id: string }>
}

/**
 * Student Edit Page với Suspense cho streaming
 * 
 * Theo Next.js 16 best practices:
 * - Header render ngay, form content stream khi ready
 * - StudentEdit component sử dụng Promise.all để fetch student, users, và auth info song song
 */
async function StudentEditContent({ studentId }: { studentId: string }) {
  return <StudentEdit studentId={studentId} variant="page" backUrl={`/admin/students/${studentId}`} />
}

export default async function StudentEditPage({ params }: StudentEditPageProps) {
  const { id } = await params
  
  // Validate route ID
  const validatedId = validateRouteId(id, "Học sinh")
  if (!validatedId) {
    return (
      <>
        <AdminHeader
          breadcrumbs={[
            { label: "Học sinh", href: "/admin/students" },
            { label: "Chỉnh sửa", href: `/admin/students/${id}/edit` },
          ]}
        />
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex min-h-[400px] flex-1 items-center justify-center">
            <div className="text-center">
              <h2 className="mb-2 text-2xl font-bold">ID không hợp lệ</h2>
              <p className="text-muted-foreground">
                ID học sinh không hợp lệ.
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
          { label: "Học sinh", href: "/admin/students" },
          { label: "Chỉnh sửa", isActive: true },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <FormPageSuspense fieldCount={8} sectionCount={2}>
          <StudentEditContent studentId={validatedId} />
        </FormPageSuspense>
      </div>
    </>
  )
}

