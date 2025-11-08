import type { Metadata } from "next"
import { AdminHeader } from "@/components/headers"
import { MessagesPageClient } from "./messages-page-client"

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

export default function MessagesPage() {
  return (
    <>
      <AdminHeader
        breadcrumbs={[
          { label: "Tin nhắn", isActive: true },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4 h-full min-h-0">
        <MessagesPageClient />
      </div>
    </>
  )
}
