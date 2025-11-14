import { AdminHeader } from "@/components/headers"
import { ResourceFormSkeleton } from "@/components/skeletons"

export default function ContactRequestEditPageLoading() {
  return (
    <>
      <AdminHeader
        breadcrumbs={[
          { label: "Yêu cầu liên hệ", href: "/admin/contact-requests" },
          { label: "Chỉnh sửa", isActive: true },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <ResourceFormSkeleton fieldCount={8} title={true} showCard={false} />
      </div>
    </>
  )
}

