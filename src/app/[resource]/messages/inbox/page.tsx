import type { Metadata } from "next"
import { AdminHeader } from "@/components/headers"
import { MessagesPage } from "@/features/admin/chat/components/messages-page"
import { MessagesPageSuspense } from "@/features/admin/resources/components"

export const metadata: Metadata = {
  title: "Hộp thư đến",
  description: "Xem tất cả hội thoại đang hoạt động",
}

export default async function MessagesInboxPage() {
  return (
    <>
      <AdminHeader
        breadcrumbs={[
          { label: "Tin nhắn", href: "/admin/messages" },
          { label: "Hộp thư đến", isActive: true },
        ]}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <MessagesPageSuspense>
          <MessagesPage initialFilterType="ACTIVE" contactScope="active" />
        </MessagesPageSuspense>
      </div>
    </>
  )
}
