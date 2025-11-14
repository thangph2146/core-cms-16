import { AdminHeader } from "@/components/headers"
import { ResourceDetailSkeleton } from "@/components/skeletons"

export default function PostDetailLoading() {
  return (
    <>
      <AdminHeader
        breadcrumbs={[
          { label: "Bài viết", href: "/admin/posts" },
          { label: "Chi tiết", isActive: true },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <ResourceDetailSkeleton showHeader={true} fieldCount={8} sectionCount={3} />
      </div>
    </>
  )
}


