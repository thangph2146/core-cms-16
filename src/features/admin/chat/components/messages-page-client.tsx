"use client"

import { ChatTemplate } from "./chat-template"
import type { Contact, Message } from "@/components/chat/types"

/**
 * Messages Page Client Component
 * 
 * Client component wrapper cho ChatTemplate
 * - Nhận initial data từ server component
 * - Xử lý client-side logic, loading states, error handling
 * - Fetch thêm data khi cần (pagination, search, etc.)
 */
interface MessagesPageClientProps {
  initialContacts: Contact[]
  currentUserId: string
  currentUserRole?: string | null
}

function MessagesPageClient({ initialContacts, currentUserId, currentUserRole }: MessagesPageClientProps) {
  const handleNewConversation = async (contact: Contact) => {
    // Optionally fetch messages for new conversation
    try {
      const { apiRoutes } = await import("@/lib/api/routes")
      const response = await fetch(`/api${apiRoutes.adminConversations.list({ otherUserId: contact.id })}`)
      if (response.ok) {
        await response.json()
        // Messages will be handled by the chat hook
      }
    } catch (error) {
      console.error("Error fetching messages for new conversation:", error)
    }
  }

  return (
    <ChatTemplate
      contacts={initialContacts}
      currentUserId={currentUserId}
      role={currentUserRole}
      onNewConversation={handleNewConversation}
    />
  )
}

export { MessagesPageClient }
export type { Contact, Message }
