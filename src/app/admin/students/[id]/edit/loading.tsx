import { AdminHeader } from "@/components/headers"
import { ResourceDetailSkeleton } from "@/components/skeletons"

export default function StudentEditPageLoading() {
  return (
    <>
      <AdminHeader
        breadcrumbs={[
          { label: "Học sinh", href: "/admin/students" },
          { label: "Chỉnh sửa", isActive: true },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <ResourceDetailSkeleton showHeader={true} fieldCount={8} sectionCount={2} />
      </div>
    </>
  )
}

