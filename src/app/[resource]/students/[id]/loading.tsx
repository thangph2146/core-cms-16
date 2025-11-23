import { AdminHeader } from "@/components/layouts/headers"
import { ResourceDetailSkeleton } from "@/components/layouts/skeletons"
import { truncateBreadcrumbLabel } from "@/features/admin/resources/utils"

export default function StudentDetailPageLoading() {
  const studentName = truncateBreadcrumbLabel("Đang tải...")
  return (
    <>
      <AdminHeader
        breadcrumbs={[
          { label: "Học sinh", href: "/admin/students" },
          { label: studentName, isActive: true },
        ]}
      />
      <ResourceDetailSkeleton showHeader={false} sectionCount={2} />
    </>
  )
}

