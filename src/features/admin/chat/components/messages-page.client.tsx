"use client"

import { ChatTemplate } from "./chat-template.client"
import { logger } from "@/lib/config"
import type { ChatFilterType, Contact, Message } from "@/components/chat/types"
import { requestJson } from "@/lib/api/client"
import { withApiBase } from "@/lib/config/api-paths"

interface MessagesPageClientProps {
  initialContacts: Contact[]
  currentUserId: string
  currentUserRole?: string | null
  initialFilterType?: ChatFilterType
}

function MessagesPageClient({
  initialContacts,
  currentUserId,
  currentUserRole,
  initialFilterType = "ACTIVE",
}: MessagesPageClientProps) {
  const handleNewConversation = async (contact: Contact) => {
    // Optionally fetch messages for new conversation
    try {
      const { apiRoutes } = await import("@/lib/api/routes")
      await requestJson(withApiBase(apiRoutes.adminConversations.list({ otherUserId: contact.id })))
      // Messages will be handled by the chat hook
    } catch (error) {
      logger.error("Error fetching messages for new conversation", error as Error)
    }
  }

  return (
    <ChatTemplate
      contacts={initialContacts}
      currentUserId={currentUserId}
      role={currentUserRole}
      initialFilterType={initialFilterType}
      onNewConversation={handleNewConversation}
    />
  )
}

export { MessagesPageClient }
export type { Contact, Message }
