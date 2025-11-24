import { LoadingWrapper } from "@/components/layouts/skeletons/loading-wrapper"
import { ResourceDetailSkeleton } from "@/components/layouts/skeletons"
import { createDetailBreadcrumbs } from "@/features/admin/resources/utils"

export default function NotificationDetailPageLoading() {
  return (
    <LoadingWrapper
      breadcrumbs={createDetailBreadcrumbs({
        listLabel: "Thông báo",
        listPath: "/admin/notifications",
        detailLabel: "Chi tiết",
        detailPath: "#",
      })}
    >
      <ResourceDetailSkeleton showHeader={false} sectionCount={1} />
    </LoadingWrapper>
  )
}

