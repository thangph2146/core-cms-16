import { AdminHeader } from "@/components/headers"
import { TagDetail } from "@/features/admin/tags/components/tag-detail"

interface TagDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function TagDetailPage({ params }: TagDetailPageProps) {
  const { id } = await params

  return (
    <>
      <AdminHeader
        breadcrumbs={[
          { label: "Thẻ tag", href: "/admin/tags" },
          { label: "Chi tiết", isActive: true },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <TagDetail tagId={id} />
      </div>
    </>
  )
}

