import { AdminHeader } from "@/components/headers"
import { ContactRequestDetail } from "@/features/admin/contact-requests/components/contact-request-detail"
import { validateRouteId } from "@/lib/validation/route-params"
import { FormPageSuspense } from "@/features/admin/resources/components"

/**
 * Contact Request Detail Page với Suspense cho streaming
 * 
 * Theo Next.js 16 best practices:
 * - Header render ngay, detail content stream khi ready
 */
async function ContactRequestDetailContent({ contactRequestId }: { contactRequestId: string }) {
  return <ContactRequestDetail contactRequestId={contactRequestId} backUrl="/admin/contact-requests" />
}

export default async function ContactRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  
  // Validate route ID
  const validatedId = validateRouteId(id, "Yêu cầu liên hệ")
  if (!validatedId) {
    return (
      <>
        <AdminHeader
          breadcrumbs={[
            { label: "Yêu cầu liên hệ", href: "/admin/contact-requests" },
            { label: "Chi tiết", href: `/admin/contact-requests/${id}` },
          ]}
        />
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex min-h-[400px] flex-1 items-center justify-center">
            <div className="text-center">
              <h2 className="mb-2 text-2xl font-bold">ID không hợp lệ</h2>
              <p className="text-muted-foreground">
                ID yêu cầu liên hệ không hợp lệ.
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
          { label: "Yêu cầu liên hệ", href: "/admin/contact-requests" },
          { label: "Chi tiết", isActive: true },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <FormPageSuspense fieldCount={8} sectionCount={2}>
          <ContactRequestDetailContent contactRequestId={validatedId} />
        </FormPageSuspense>
      </div>
    </>
  )
}

