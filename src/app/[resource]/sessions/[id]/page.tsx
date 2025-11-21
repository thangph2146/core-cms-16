import type { Metadata } from "next"
import { AdminHeader } from "@/components/layouts/headers"
import { SessionDetail } from "@/features/admin/sessions/components/session-detail"
import { validateRouteId } from "@/lib/validation/route-params"
import { FormPageSuspense } from "@/features/admin/resources/components"
import { getSessionDetailById } from "@/features/admin/sessions/server/cache"

/**
 * Session Detail Page Metadata (Dynamic)
 * 
 * Theo Next.js 16 best practices:
 * - Sử dụng generateMetadata để tạo metadata động dựa trên session data
 * - Metadata được merge với admin layout và root layout
 * - Title sử dụng template từ root: "Session {User Email} | CMS"
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
    title: `Session ${session.userEmail || session.userId || ""}`.trim() || "Chi tiết session",
    description: `Chi tiết session: ${session.userEmail || session.userId || ""}`,
  }
}

interface SessionDetailPageProps {
  params: Promise<{ id: string }>
}

/**
 * Session Detail Page với Suspense cho streaming
 * 
 * Theo Next.js 16 best practices:
 * - Header render ngay, detail content stream khi ready
 */
async function SessionDetailContent({ sessionId }: { sessionId: string }) {
  return <SessionDetail sessionId={sessionId} backUrl="/admin/sessions" />
}

export default async function SessionDetailPage({ params }: SessionDetailPageProps) {
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
          { label: sessionName, isActive: true },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <FormPageSuspense fieldCount={6} sectionCount={1}>
          <SessionDetailContent sessionId={validatedId} />
        </FormPageSuspense>
      </div>
    </>
  )
}

