import { AdminHeader } from "@/components/headers"
import { MessagesPageSkeleton } from "@/components/skeletons"

export default function Loading() {
  return (
    <>
      <AdminHeader
        breadcrumbs={[
          { label: "Tin nhắn", href: "/admin/messages" },
          { label: "Hộp thư đã xoá", isActive: true },
        ]}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <MessagesPageSkeleton />
      </div>
    </>
  )
}

