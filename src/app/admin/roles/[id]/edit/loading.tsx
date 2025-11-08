import { AdminHeader } from "@/components/headers"
import { ResourceDetailSkeleton } from "@/components/skeletons"

export default function RoleEditPageLoading() {
  return (
    <>
      <AdminHeader
        breadcrumbs={[
          { label: "Vai trò", href: "/admin/roles" },
          { label: "Chỉnh sửa", isActive: true },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <ResourceDetailSkeleton showHeader={true} fieldCount={6} sectionCount={2} />
      </div>
    </>
  )
}

