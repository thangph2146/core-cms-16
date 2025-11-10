import type { Metadata } from "next"
import { AdminHeader } from "@/components/headers"
import { MessagesPageClient } from "@/features/admin/chat/messages-page-client"

/**
 * Messages Page Metadata
 * 
 * Theo Next.js 16 best practices:
 * - Metadata được merge với admin layout và root layout
 * - Title sử dụng template từ root: "Tin nhắn | CMS"
 */
export const metadata: Metadata = {
  title: "Tin nhắn",
  description: "Quản lý tin nhắn và chat",
}

/**
 * Messages Page
 * 
 * Trang quản lý tin nhắn và chat
 * - Sử dụng AdminHeader với breadcrumbs
 * - ChatTemplate được render trong flex container để phù hợp với layout
 */
export default function MessagesPage() {
  return (
    <>
      <AdminHeader
        breadcrumbs={[
          { label: "Tin nhắn", isActive: true },
        ]}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <MessagesPageClient />
      </div>
    </>
  )
}
