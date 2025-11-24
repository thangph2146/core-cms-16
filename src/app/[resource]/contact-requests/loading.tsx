import { LoadingWrapper } from "@/components/layouts/skeletons/loading-wrapper"
import { ResourceTableSkeleton } from "@/components/layouts/skeletons"
import { createListBreadcrumbs } from "@/features/admin/resources/utils"

export default function ContactRequestsPageLoading() {
  return (
    <LoadingWrapper breadcrumbs={createListBreadcrumbs({ listLabel: "Yêu cầu liên hệ" })}>
      <ResourceTableSkeleton title={false} rowCount={10} columnCount={6} />
    </LoadingWrapper>
  )
}

