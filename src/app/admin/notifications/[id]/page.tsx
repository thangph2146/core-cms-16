import { AdminHeader } from "@/components/headers"
import { NotificationDetail } from "@/features/admin/notifications/components/notification-detail"
import { validateRouteId } from "@/lib/validation/route-params"
import { FormPageSuspense } from "@/features/admin/resources/components"

/**
 * Notification Detail Page với Suspense cho streaming
 * 
 * Theo Next.js 16 best practices:
 * - Header render ngay, detail content stream khi ready
 */
async function NotificationDetailContent({ notificationId }: { notificationId: string }) {
  return <NotificationDetail notificationId={notificationId} backUrl="/admin/notifications" />
}

export default async function NotificationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  
  // Validate route ID
  const validatedId = validateRouteId(id, "Thông báo")
  if (!validatedId) {
    return (
      <>
        <AdminHeader
          breadcrumbs={[
            { label: "Thông báo", href: "/admin/notifications" },
            { label: "Chi tiết", href: `/admin/notifications/${id}` },
          ]}
        />
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex min-h-[400px] flex-1 items-center justify-center">
            <div className="text-center">
              <h2 className="mb-2 text-2xl font-bold">ID không hợp lệ</h2>
              <p className="text-muted-foreground">
                ID thông báo không hợp lệ.
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
          { label: "Thông báo", href: "/admin/notifications" },
          { label: "Chi tiết", isActive: true },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <FormPageSuspense fieldCount={6} sectionCount={1}>
          <NotificationDetailContent notificationId={validatedId} />
        </FormPageSuspense>
      </div>
    </>
  )
}

