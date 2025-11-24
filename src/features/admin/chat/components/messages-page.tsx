/**
 * Server Component: Messages Page
 * 
 * Fetches conversations và pass xuống client component
 * Pattern: Server Component (data fetching) → Client Component (UI/interactions)
 */

import { getAuthInfo } from "@/features/admin/resources/server/auth-helpers"
import {
  listConversations,
  getMessagesBetweenUsers,
  listGroups,
  getMessagesForGroup,
} from "../server/queries"
import { MessagesPageClient } from "./messages-page.client"
import type { ChatFilterType, Contact } from "@/components/chat/types"
import { ensureDate, mapGroupListItemToContact, mapMessageDetailToMessage } from "../utils/contact-transformers"

type ContactScope = "active" | "deleted"

interface MessagesPageProps {
  initialFilterType?: ChatFilterType
  contactScope?: ContactScope
}

export async function MessagesPage({
  initialFilterType = "ACTIVE",
  contactScope = "active",
}: MessagesPageProps = {}) {
  const authInfo = await getAuthInfo()

  if (!authInfo.actorId) {
    return <div>Unauthorized</div>
  }

  const currentUserId = authInfo.actorId

  // Fetch conversations
  const conversationsResult = await listConversations({
    userId: currentUserId,
    page: 1,
    limit: 50,
  })

  const includeDeletedGroups = contactScope !== "active"

  // Fetch groups (toggle includeDeleted based on scope)
  const groupsResult = await listGroups({
    userId: currentUserId,
    page: 1,
    limit: 50,
    includeDeleted: includeDeletedGroups,
  })

  // Map conversations to Contact format
  const personalContacts: Contact[] = await Promise.all(
    conversationsResult.data.map(async (conv) => {
      const messages = await getMessagesBetweenUsers(currentUserId, conv.otherUser.id, 100)
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
      const messages = await getMessagesForGroup(groupData.id, currentUserId, 100)

      return mapGroupListItemToContact({
        groupData,
        messages,
        currentUserId,
      })
    })
  )

  // Merge personal contacts and groups, sort by lastMessageTime
  const mergedContacts: Contact[] = [...personalContacts, ...groupContacts].sort((a, b) => {
    const timeA = a.lastMessageTime?.getTime() || 0
    const timeB = b.lastMessageTime?.getTime() || 0
    return timeB - timeA
  })

  const contacts: Contact[] =
    contactScope === "active"
      ? mergedContacts.filter((contact) => !contact.isDeleted)
      : contactScope === "deleted"
        ? mergedContacts.filter((contact) => contact.type === "GROUP" && contact.isDeleted)
        : mergedContacts

  return (
    <MessagesPageClient
      initialContacts={contacts}
      currentUserId={currentUserId}
      currentUserRole={authInfo.roles[0]?.name || null}
      initialFilterType={initialFilterType}
    />
  )
}
