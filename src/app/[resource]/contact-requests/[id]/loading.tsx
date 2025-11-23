import { AdminHeader } from "@/components/layouts/headers"
import { ResourceDetailSkeleton } from "@/components/layouts/skeletons"
import { truncateBreadcrumbLabel } from "@/features/admin/resources/utils"

export default function ContactRequestDetailPageLoading() {
  const contactRequestName = truncateBreadcrumbLabel("Đang tải...")
  return (
    <>
      <AdminHeader
        breadcrumbs={[
          { label: "Yêu cầu liên hệ", href: "/admin/contact-requests" },
          { label: contactRequestName, isActive: true },
        ]}
      />
      <ResourceDetailSkeleton showHeader={false} sectionCount={2} />
    </>
  )
}

