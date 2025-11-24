import { LoadingWrapper } from "@/components/layouts/skeletons/loading-wrapper"
import { ResourceTableSkeleton } from "@/components/layouts/skeletons"
import { createListBreadcrumbs } from "@/features/admin/resources/utils"

export default function UsersPageLoading() {
  return (
    <LoadingWrapper breadcrumbs={createListBreadcrumbs({ listLabel: "Users" })}>
      <ResourceTableSkeleton title={false} rowCount={10} columnCount={6} />
    </LoadingWrapper>
  )
}

