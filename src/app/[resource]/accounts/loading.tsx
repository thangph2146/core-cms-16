import { LoadingWrapper } from "@/components/layouts/skeletons/loading-wrapper"
import { ResourceDetailSkeleton } from "@/components/layouts/skeletons"
import { createListBreadcrumbs } from "@/features/admin/resources/utils"

export default function AccountsLoading() {
  return (
    <LoadingWrapper breadcrumbs={createListBreadcrumbs({ listLabel: "Tài khoản" })}>
      <ResourceDetailSkeleton showHeader={false} sectionCount={2} />
    </LoadingWrapper>
  )
}

