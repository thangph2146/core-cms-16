import { AdminHeader } from "@/components/headers"
import { SessionEdit } from "@/features/admin/sessions/components/session-edit"
import { validateRouteId } from "@/lib/validation/route-params"

interface SessionEditPageProps {
  params: Promise<{ id: string }>
}

export default async function SessionEditPage({ params }: SessionEditPageProps) {
  const { id } = await params
  
  // Validate route ID
  const validatedId = validateRouteId(id, "Session")
  if (!validatedId) {
    return (
      <>
        <AdminHeader
          breadcrumbs={[
            { label: "Session", href: "/admin/sessions" },
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
          { label: "Chỉnh sửa", isActive: true },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <SessionEdit sessionId={validatedId} variant="page" backUrl={`/admin/sessions/${validatedId}`} />
      </div>
    </>
  )
}

