import { AdminHeader } from "@/components/headers"
import { TagCreate } from "@/features/admin/tags/components/tag-create"

export default async function TagCreatePage() {
  return (
    <>
      <AdminHeader
        breadcrumbs={[
          { label: "Thẻ tag", href: "/admin/tags" },
          { label: "Tạo mới", isActive: true },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <TagCreate />
      </div>
    </>
  )
}

