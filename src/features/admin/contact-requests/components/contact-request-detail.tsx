/**
 * Server Component: Contact Request Detail
 * 
 * Fetches contact request data và pass xuống client component
 * Pattern: Server Component (data fetching) → Client Component (UI/interactions)
 */

import { getContactRequestDetailById } from "../server/cache"
import { serializeContactRequestDetail } from "../server/helpers"
import { ContactRequestDetailClient } from "./contact-request-detail.client"
import type { ContactRequestDetailData } from "./contact-request-detail.client"

export interface ContactRequestDetailProps {
  contactRequestId: string
  backUrl?: string
}

export async function ContactRequestDetail({ contactRequestId, backUrl = "/admin/contact-requests" }: ContactRequestDetailProps) {
  const contactRequest = await getContactRequestDetailById(contactRequestId)

  if (!contactRequest) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4 md:p-6 lg:p-8">
        <div className="text-center">
          <p className="text-muted-foreground">Không tìm thấy yêu cầu liên hệ</p>
        </div>
      </div>
    )
  }

  return (
    <ContactRequestDetailClient
      contactRequestId={contactRequestId}
      contactRequest={serializeContactRequestDetail(contactRequest) as ContactRequestDetailData}
      backUrl={backUrl}
    />
  )
}

