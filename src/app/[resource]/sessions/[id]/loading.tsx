import { AdminHeader } from "@/components/layouts/headers"
import { ResourceDetailSkeleton } from "@/components/layouts/skeletons"
import { truncateBreadcrumbLabel } from "@/features/admin/resources/utils"

export default function SessionDetailPageLoading() {
  const sessionName = truncateBreadcrumbLabel("Đang tải...")
  return (
    <>
      <AdminHeader
        breadcrumbs={[
          { label: "Session", href: "/admin/sessions" },
          { label: sessionName, isActive: true },
        ]}
      />
      <ResourceDetailSkeleton showHeader={false} sectionCount={1} />
    </>
  )
}

