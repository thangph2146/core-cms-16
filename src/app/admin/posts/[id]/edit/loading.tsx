import { AdminHeader } from "@/components/headers"
import { ResourceFormSkeleton } from "@/components/skeletons"

export default function PostEditLoading() {
  return (
    <>
      <AdminHeader
        breadcrumbs={[
          { label: "Bài viết", href: "/admin/posts" },
          { label: "Chỉnh sửa", isActive: true },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <ResourceFormSkeleton fieldCount={6} title={true} showCard={false} />
      </div>
    </>
  )
}


