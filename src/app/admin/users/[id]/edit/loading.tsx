import { AdminHeader } from "@/components/headers"
import { ResourceFormSkeleton } from "@/components/skeletons"

export default function UserEditPageLoading() {
  return (
    <>
      <AdminHeader
        breadcrumbs={[
          { label: "Users", href: "/admin/users" },
          { label: "Chỉnh sửa", isActive: true },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <ResourceFormSkeleton fieldCount={8} title={true} showCard={false} />
      </div>
    </>
  )
}

