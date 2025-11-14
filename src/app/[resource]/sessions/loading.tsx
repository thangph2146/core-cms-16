import { AdminHeader } from "@/components/headers"
import { ResourceTableSkeleton } from "@/components/skeletons"

export default function SessionsPageLoading() {
  return (
    <>
      <AdminHeader
        breadcrumbs={[
          { label: "Session", isActive: true },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <ResourceTableSkeleton title={false} rowCount={10} columnCount={5} />
      </div>
    </>
  )
}

