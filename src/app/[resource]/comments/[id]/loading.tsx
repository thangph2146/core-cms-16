import { AdminHeader } from "@/components/layouts/headers"
import { ResourceDetailSkeleton } from "@/components/layouts/skeletons"
import { truncateBreadcrumbLabel } from "@/features/admin/resources/utils"

export default function CommentDetailPageLoading() {
  const authorName = truncateBreadcrumbLabel("Đang tải...")
  return (
    <>
      <AdminHeader
        breadcrumbs={[
          { label: "Bình luận", href: "/admin/comments" },
          { label: authorName, isActive: true },
        ]}
      />
      <ResourceDetailSkeleton showHeader={false} sectionCount={1} />
    </>
  )
}

