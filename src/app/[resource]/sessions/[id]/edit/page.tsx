import type { Metadata } from "next"
import { AdminHeader } from "@/components/layouts/headers"
import { SessionEdit } from "@/features/admin/sessions/components/session-edit"
import { validateRouteId } from "@/lib/validation/route-params"
import { FormPageSuspense } from "@/features/admin/resources/components"
import { getSessionDetailById } from "@/features/admin/sessions/server/cache"

/**
 * Session Edit Page Metadata (Dynamic)
 * 
 * Theo Next.js 16 best practices:
 * - Sử dụng generateMetadata để tạo metadata động dựa trên session data
 * - Metadata được merge với admin layout và root layout
 * - Title sử dụng template từ root: "Chỉnh sửa Session {User Email} | CMS"
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const session = await getSessionDetailById(id)

  if (!session) {
    return {
      title: "Không tìm thấy",
      description: "Session không tồn tại",
    }
  }

  return {
    title: `Chỉnh sửa Session ${session.userEmail || session.userId || ""}`.trim() || "Chỉnh sửa session",
    description: `Chỉnh sửa thông tin session: ${session.userEmail || session.userId || ""}`,
  }
}

interface SessionEditPageProps {
  params: Promise<{ id: string }>
}

/**
 * Session Edit Page với Suspense cho streaming
 * 
 * Theo Next.js 16 best practices:
 * - Header render ngay, form content stream khi ready
 */
async function SessionEditContent({ sessionId }: { sessionId: string }) {
  return <SessionEdit sessionId={sessionId} variant="page" backUrl={`/admin/sessions/${sessionId}`} />
}

export default async function SessionEditPage({ params }: SessionEditPageProps) {
  const { id } = await params
  
  // Fetch session data từ cache để hiển thị tên trong breadcrumb
  const session = await getSessionDetailById(id)
  const sessionName = session?.userEmail || session?.userId || "Chi tiết"
  
  // Validate route ID
  const validatedId = validateRouteId(id, "Session")
  if (!validatedId) {
    return (
      <>
        <AdminHeader
          breadcrumbs={[
            { label: "Session", href: "/admin/sessions" },
            { label: sessionName, href: `/admin/sessions/${id}` },
            { label: "Chỉnh sửa", href: `/admin/sessions/${id}/edit` },
          ]}
        />
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex min-h-[400px] flex-1 items-center justify-center">
            <div className="text-center">
              <h2 className="mb-2 text-2xl font-bold">ID không hợp lệ</h2>
              <p className="text-muted-foreground">
                ID session không hợp lệ.
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
          { label: "Session", href: "/admin/sessions" },
          { label: sessionName, href: `/admin/sessions/${id}` },
          { label: "Chỉnh sửa", isActive: true },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <FormPageSuspense fieldCount={6} sectionCount={1}>
          <SessionEditContent sessionId={validatedId} />
        </FormPageSuspense>
      </div>
    </>
  )
}

