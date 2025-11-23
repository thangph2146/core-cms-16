/**
 * Server Component: Contact Request Edit
 * 
 * Fetches contact request data và users options, sau đó pass xuống client component
 * Pattern: Server Component (data fetching) → Client Component (UI/interactions)
 */

import { getContactRequestById } from "../server/queries"
import { serializeContactRequestDetail } from "../server/helpers"
import { ContactRequestEditClient } from "./contact-request-edit.client"
import type { ContactRequestEditClientProps } from "./contact-request-edit.client"
import { getActiveUsersForSelect } from "@/features/admin/users/server/queries"
import { NotFoundMessage } from "@/features/admin/resources/components"

export interface ContactRequestEditProps {
  contactRequestId: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
  variant?: "dialog" | "sheet" | "page"
  backUrl?: string
  backLabel?: string
}

export async function ContactRequestEdit({
  contactRequestId,
  open = true,
  onOpenChange,
  onSuccess,
  variant = "dialog",
  backUrl,
  backLabel = "Quay lại",
}: ContactRequestEditProps) {
  const [contactRequest, usersOptions] = await Promise.all([
    getContactRequestById(contactRequestId),
    getActiveUsersForSelect(100),
  ])

  if (!contactRequest) {
    return <NotFoundMessage resourceName="yêu cầu liên hệ" />
  }

  const contactRequestForEdit: ContactRequestEditClientProps["contactRequest"] = {
    ...serializeContactRequestDetail(contactRequest),
  }

  return (
    <ContactRequestEditClient
      contactRequest={contactRequestForEdit}
      open={open}
      onOpenChange={onOpenChange}
      onSuccess={onSuccess}
      variant={variant}
      backUrl={backUrl}
      backLabel={backLabel}
      contactRequestId={contactRequestId}
      usersOptions={usersOptions}
    />
  )
}

