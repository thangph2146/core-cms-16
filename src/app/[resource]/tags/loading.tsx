import { AdminHeader } from "@/components/headers"
import { ResourceTableSkeleton } from "@/components/skeletons"

export default function TagsPageLoading() {
  return (
    <>
      <AdminHeader
        breadcrumbs={[
          { label: "Thẻ tag", isActive: true },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <ResourceTableSkeleton title={false} rowCount={10} columnCount={4} />
      </div>
    </>
  )
}

