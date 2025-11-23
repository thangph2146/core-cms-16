import { AdminHeader } from "@/components/layouts/headers"
import { ResourceFormSkeleton } from "@/components/layouts/skeletons"
import { truncateBreadcrumbLabel } from "@/features/admin/resources/utils"

export default function StudentEditPageLoading() {
  const studentName = truncateBreadcrumbLabel("Đang tải...")
  return (
    <>
      <AdminHeader
        breadcrumbs={[
          { label: "Học sinh", href: "/admin/students" },
          { label: studentName, href: "#" },
          { label: "Chỉnh sửa", isActive: true },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <ResourceFormSkeleton variant="page" fieldCount={8} showCard={false} />
      </div>
    </>
  )
}
