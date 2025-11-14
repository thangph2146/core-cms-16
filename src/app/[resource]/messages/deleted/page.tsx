import type { Metadata } from "next"
import { AdminHeader } from "@/components/headers"
import { MessagesPage } from "@/features/admin/chat/components/messages-page"
import { MessagesPageSuspense } from "@/features/admin/resources/components"

export const metadata: Metadata = {
  title: "Hộp thư đã xoá",
  description: "Xem và khôi phục các hội thoại đã xoá",
}

export default async function MessagesDeletedPage() {
  return (
    <>
      <AdminHeader
        breadcrumbs={[
          { label: "Tin nhắn", href: "/admin/messages" },
          { label: "Hộp thư đã xoá", isActive: true },
        ]}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <MessagesPageSuspense>
          <MessagesPage initialFilterType="DELETED" contactScope="deleted" />
        </MessagesPageSuspense>
      </div>
    </>
  )
}
