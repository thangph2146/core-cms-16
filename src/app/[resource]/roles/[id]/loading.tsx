import { AdminHeader } from "@/components/layouts/headers"
import { ResourceDetailSkeleton } from "@/components/layouts/skeletons"

export default function RoleDetailPageLoading() {
  return (
    <>
      <AdminHeader
        breadcrumbs={[
          { label: "Vai trò", href: "/admin/roles" },
          { label: "Chi tiết", isActive: true },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <ResourceDetailSkeleton showHeader={true} fieldCount={6} sectionCount={3} />
      </div>
    </>
  )
}

