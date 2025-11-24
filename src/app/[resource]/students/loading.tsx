import { LoadingWrapper } from "@/components/layouts/skeletons/loading-wrapper"
import { ResourceTableSkeleton } from "@/components/layouts/skeletons"
import { createListBreadcrumbs } from "@/features/admin/resources/utils"

export default function StudentsPageLoading() {
  return (
    <LoadingWrapper breadcrumbs={createListBreadcrumbs({ listLabel: "Học sinh" })}>
      <ResourceTableSkeleton title={false} rowCount={10} columnCount={5} />
    </LoadingWrapper>
  )
}

