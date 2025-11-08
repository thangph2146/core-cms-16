import { AdminHeader } from "@/components/headers"
import { ResourceDetailSkeleton } from "@/components/skeletons"

export default function CategoryCreatePageLoading() {
  return (
    <>
      <AdminHeader
        breadcrumbs={[
          { label: "Danh mục", href: "/admin/categories" },
          { label: "Tạo mới", isActive: true },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <ResourceDetailSkeleton showHeader={true} fieldCount={6} sectionCount={1} />
      </div>
    </>
  )
}

