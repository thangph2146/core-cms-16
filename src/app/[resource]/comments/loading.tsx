import { AdminHeader } from "@/components/headers"
import { ResourceTableSkeleton } from "@/components/skeletons"

export default function CommentsPageLoading() {
  return (
    <>
      <AdminHeader
        breadcrumbs={[
          { label: "Bình luận", isActive: true },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <ResourceTableSkeleton title={false} rowCount={10} columnCount={6} />
      </div>
    </>
  )
}

