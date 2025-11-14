import { AdminHeader } from "@/components/headers"
import { ResourceTableSkeleton } from "@/components/skeletons"

export default function StudentsPageLoading() {
  return (
    <>
      <AdminHeader
        breadcrumbs={[
          { label: "Học sinh", isActive: true },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <ResourceTableSkeleton title={false} rowCount={10} columnCount={5} />
      </div>
    </>
  )
}

