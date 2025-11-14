import type { Metadata } from "next"
import { AdminHeader } from "@/components/headers"
import { StudentEdit } from "@/features/admin/students/components/student-edit"
import { validateRouteId } from "@/lib/validation/route-params"
import { FormPageSuspense } from "@/features/admin/resources/components"
import { getStudentDetailById } from "@/features/admin/students/server/cache"
import { getAuthInfo } from "@/features/admin/resources/server"

/**
 * Student Edit Page Metadata (Dynamic)
 * 
 * Theo Next.js 16 best practices:
 * - Sử dụng generateMetadata để tạo metadata động dựa trên student data
 * - Metadata được merge với admin layout và root layout
 * - Title sử dụng template từ root: "Chỉnh sửa {Student Name} | CMS"
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const { actorId, isSuperAdminUser } = await getAuthInfo()
  const student = await getStudentDetailById(id, actorId, isSuperAdminUser)

  if (!student) {
    return {
      title: "Không tìm thấy",
      description: "Học sinh không tồn tại",
    }
  }

  return {
    title: `Chỉnh sửa ${student.name || student.studentCode || "học sinh"}`,
    description: `Chỉnh sửa thông tin học sinh: ${student.name || student.studentCode}`,
  }
}

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

