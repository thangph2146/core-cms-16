import type { Metadata } from "next"
import { AdminHeader } from "@/components/layouts/headers"
import { ContactRequestDetail } from "@/features/admin/contact-requests/components/contact-request-detail"
import { validateRouteId } from "@/lib/validation/route-params"
import { FormPageSuspense } from "@/features/admin/resources/components"
import { getContactRequestDetailById } from "@/features/admin/contact-requests/server/cache"

/**
 * Contact Request Detail Page Metadata (Dynamic)
 * 
 * Theo Next.js 16 best practices:
 * - Sử dụng generateMetadata để tạo metadata động dựa trên contact request data
 * - Metadata được merge với admin layout và root layout
 * - Title sử dụng template từ root: "Yêu cầu liên hệ {Name} | CMS"
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const contactRequest = await getContactRequestDetailById(id)

  if (!contactRequest) {
    return {
      title: "Không tìm thấy",
      description: "Yêu cầu liên hệ không tồn tại",
    }
  }

  const descriptionText = contactRequest.content || contactRequest.subject || `Yêu cầu liên hệ từ ${contactRequest.name || contactRequest.email || ""}`
  const descriptionPreview = descriptionText.length > 100 ? descriptionText.substring(0, 100) + "..." : descriptionText

  return {
    title: `Yêu cầu liên hệ ${contactRequest.name || contactRequest.email || ""}`.trim() || "Chi tiết yêu cầu liên hệ",
    description: descriptionPreview,
  }
}

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
  
  // Fetch contact request data từ cache để hiển thị tên trong breadcrumb
  const contactRequest = await getContactRequestDetailById(id)
  const contactRequestName = contactRequest?.name || contactRequest?.email || "Chi tiết"
  
  // Validate route ID
  const validatedId = validateRouteId(id, "Yêu cầu liên hệ")
  if (!validatedId) {
    return (
      <>
        <AdminHeader
          breadcrumbs={[
            { label: "Yêu cầu liên hệ", href: "/admin/contact-requests" },
            { label: contactRequestName, href: `/admin/contact-requests/${id}` },
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
          { label: contactRequestName, isActive: true },
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

