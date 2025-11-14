import type { Metadata } from "next"
import { AdminHeader } from "@/components/headers"
import { StudentDetail } from "@/features/admin/students/components/student-detail"
import { validateRouteId } from "@/lib/validation/route-params"
import { FormPageSuspense } from "@/features/admin/resources/components"
import { getStudentDetailById } from "@/features/admin/students/server/cache"
import { getAuthInfo } from "@/features/admin/resources/server"

/**
 * Student Detail Page Metadata (Dynamic)
 * 
 * Theo Next.js 16 best practices:
 * - Sử dụng generateMetadata để tạo metadata động dựa trên student data
 * - Metadata được merge với admin layout và root layout
 * - Title sử dụng template từ root: "{Student Name} | CMS"
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
    title: student.name || student.studentCode || "Chi tiết học sinh",
    description: `Chi tiết học sinh: ${student.name || student.studentCode}`,
  }
}

interface StudentDetailPageProps {
  params: Promise<{ id: string }>
}

/**
 * Student Detail Page với Suspense cho streaming
 * 
 * Theo Next.js 16 best practices:
 * - Header render ngay, detail content stream khi ready
 */
async function StudentDetailContent({ studentId }: { studentId: string }) {
  return <StudentDetail studentId={studentId} backUrl="/admin/students" />
}

export default async function StudentDetailPage({ params }: StudentDetailPageProps) {
  const { id } = await params
  
  // Validate route ID
  const validatedId = validateRouteId(id, "Học sinh")
  if (!validatedId) {
    return (
      <>
        <AdminHeader
          breadcrumbs={[
            { label: "Học sinh", href: "/admin/students" },
            { label: "Chi tiết", href: `/admin/students/${id}` },
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
          { label: "Chi tiết", isActive: true },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <FormPageSuspense fieldCount={8} sectionCount={2}>
          <StudentDetailContent studentId={validatedId} />
        </FormPageSuspense>
      </div>
    </>
  )
}

