import { LoadingWrapper } from "@/components/layouts/skeletons/loading-wrapper"
import { ResourceTableSkeleton } from "@/components/layouts/skeletons"
import { createListBreadcrumbs } from "@/features/admin/resources/utils"

export default function SessionsPageLoading() {
  return (
    <LoadingWrapper breadcrumbs={createListBreadcrumbs({ listLabel: "Session" })}>
      <ResourceTableSkeleton title={false} rowCount={10} columnCount={5} />
    </LoadingWrapper>
  )
}

