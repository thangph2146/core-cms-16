import { AdminHeader } from "@/components/headers"
import { TagEdit } from "@/features/admin/tags/components/tag-edit"

interface TagEditPageProps {
  params: Promise<{ id: string }>
}

export default async function TagEditPage({ params }: TagEditPageProps) {
  const { id } = await params

  return (
    <>
      <AdminHeader
        breadcrumbs={[
          { label: "Thẻ tag", href: "/admin/tags" },
          { label: "Chỉnh sửa", isActive: true },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <TagEdit tagId={id} variant="page" backUrl={`/admin/tags/${id}`} />
      </div>
    </>
  )
}

