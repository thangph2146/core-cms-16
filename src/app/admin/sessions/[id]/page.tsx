import { AdminHeader } from "@/components/headers"
import { SessionDetail } from "@/features/admin/sessions/components/session-detail"
import { validateRouteId } from "@/lib/validation/route-params"
import { FormPageSuspense } from "@/features/admin/resources/components"

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
  
  // Validate route ID
  const validatedId = validateRouteId(id, "Session")
  if (!validatedId) {
    return (
      <>
        <AdminHeader
          breadcrumbs={[
            { label: "Session", href: "/admin/sessions" },
            { label: "Chi tiết", href: `/admin/sessions/${id}` },
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
          { label: "Chi tiết", isActive: true },
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

