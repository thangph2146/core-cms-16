/**
 * Server Component: Contact Request Detail
 * 
 * Fetches contact request data và pass xuống client component
 * Pattern: Server Component (data fetching) → Client Component (UI/interactions)
 */

import { getContactRequestById } from "../server/queries"
import { serializeContactRequestDetail } from "../server/helpers"
import { ContactRequestDetailClient } from "./contact-request-detail.client"
import type { ContactRequestDetailData } from "./contact-request-detail.client"
import { NotFoundMessage } from "@/features/admin/resources/components"

export interface ContactRequestDetailProps {
  contactRequestId: string
  backUrl?: string
}

export async function ContactRequestDetail({ contactRequestId, backUrl = "/admin/contact-requests" }: ContactRequestDetailProps) {
  const contactRequest = await getContactRequestById(contactRequestId)

  if (!contactRequest) {
    return <NotFoundMessage resourceName="yêu cầu liên hệ" />
  }

  return (
    <ContactRequestDetailClient
      contactRequestId={contactRequestId}
      contactRequest={serializeContactRequestDetail(contactRequest) as ContactRequestDetailData}
      backUrl={backUrl}
    />
  )
}

