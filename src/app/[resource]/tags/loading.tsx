import { LoadingWrapper } from "@/components/layouts/skeletons/loading-wrapper"
import { ResourceTableSkeleton } from "@/components/layouts/skeletons"
import { createListBreadcrumbs } from "@/features/admin/resources/utils"

export default function TagsPageLoading() {
  return (
    <LoadingWrapper breadcrumbs={createListBreadcrumbs({ listLabel: "Thẻ tag" })}>
      <ResourceTableSkeleton title={false} rowCount={10} columnCount={4} />
    </LoadingWrapper>
  )
}

