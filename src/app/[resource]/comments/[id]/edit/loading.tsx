import { AdminHeader } from "@/components/layouts/headers"
import { ResourceFormSkeleton } from "@/components/layouts/skeletons"

export default function CommentEditPageLoading() {
  return (
    <>
      <AdminHeader
        breadcrumbs={[
          { label: "Bình luận", href: "/admin/comments" },
          { label: "Chi tiết", href: "#" },
          { label: "Chỉnh sửa", isActive: true },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <ResourceFormSkeleton variant="page" fieldCount={6} showCard={false} />
      </div>
    </>
  )
}

