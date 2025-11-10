/**
 * Server Component: Messages Page
 * 
 * Fetches conversations và pass xuống client component
 * Pattern: Server Component (data fetching) → Client Component (UI/interactions)
 */

import { getAuthInfo } from "@/features/admin/resources/server/auth-helpers"
import {
  listConversationsCached,
  getMessagesBetweenUsersCached,
  listGroupsCached,
  getMessagesForGroupCached,
} from "../server/cache"
import { MessagesPageClient } from "./messages-page-client"
import type { Contact } from "@/components/chat/types"
import { ensureDate, mapGroupListItemToContact, mapMessageDetailToMessage } from "../utils/contact-transformers"

export async function MessagesPage() {
  const authInfo = await getAuthInfo()

  if (!authInfo.actorId) {
    return <div>Unauthorized</div>
  }

  const currentUserId = authInfo.actorId

  // Fetch conversations
  const conversationsResult = await listConversationsCached({
    userId: currentUserId,
    page: 1,
    limit: 50,
  })

  // Fetch groups (active + deleted)
  const groupsResult = await listGroupsCached({
    userId: currentUserId,
    page: 1,
    limit: 50,
    includeDeleted: true,
  })

  // Map conversations to Contact format
  const personalContacts: Contact[] = await Promise.all(
    conversationsResult.data.map(async (conv) => {
      const messages = await getMessagesBetweenUsersCached(currentUserId, conv.otherUser.id, 100)
      const mappedMessages = messages.map(mapMessageDetailToMessage)

      return {
        id: conv.otherUser.id,
        name: conv.otherUser.name || conv.otherUser.email,
        email: conv.otherUser.email,
        image: conv.otherUser.avatar,
        lastMessage: conv.lastMessage?.content || "",
        lastMessageTime: ensureDate(conv.lastMessage?.timestamp, conv.updatedAt),
        unreadCount: conv.unreadCount,
        isOnline: conv.otherUser.isOnline || false,
        messages: mappedMessages,
        type: "PERSONAL" as const,
        isDeleted: false,
      }
    })
  )

  // Map groups to Contact format
  const groupContacts: Contact[] = await Promise.all(
    groupsResult.data.map(async (groupData) => {
      const messages = await getMessagesForGroupCached(groupData.id, currentUserId, 100)

      return mapGroupListItemToContact({
        groupData,
        messages,
        currentUserId,
      })
    })
  )

  // Merge personal contacts and groups, sort by lastMessageTime
  const contacts: Contact[] = [...personalContacts, ...groupContacts].sort((a, b) => {
    const timeA = a.lastMessageTime?.getTime() || 0
    const timeB = b.lastMessageTime?.getTime() || 0
    return timeB - timeA
  })

  return (
    <MessagesPageClient
      initialContacts={contacts}
      currentUserId={currentUserId}
      currentUserRole={authInfo.roles[0]?.name || null}
    />
  )
}

