/**
 * Server Component: Messages Page
 * 
 * Fetches conversations và pass xuống client component
 * Pattern: Server Component (data fetching) → Client Component (UI/interactions)
 */

import { getAuthInfo } from "@/features/admin/resources/server/auth-helpers"
import { listConversationsCached, getMessagesBetweenUsersCached, listGroupsCached, getMessagesForGroupCached } from "../server/cache"
import { MessagesPageClient } from "./messages-page-client"
import type { Contact, Message, Group } from "@/components/chat/types"

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

  // Fetch groups
  const groupsResult = await listGroupsCached({
    userId: currentUserId,
    page: 1,
    limit: 50,
  })

  // Map conversations to Contact format
  const personalContacts: Contact[] = await Promise.all(
    conversationsResult.data.map(async (conv) => {
      // Fetch messages for each conversation
      const messages = await getMessagesBetweenUsersCached(currentUserId, conv.otherUser.id, 100)

      return {
        id: conv.otherUser.id,
        name: conv.otherUser.name || conv.otherUser.email,
        email: conv.otherUser.email,
        image: conv.otherUser.avatar,
        lastMessage: conv.lastMessage?.content || "",
        lastMessageTime: conv.lastMessage?.timestamp || conv.updatedAt,
        unreadCount: conv.unreadCount,
        isOnline: conv.otherUser.isOnline || false,
        messages: messages.map((msg): Message => ({
          id: msg.id,
          content: msg.content,
          subject: msg.subject,
          senderId: msg.senderId,
          receiverId: msg.receiverId,
          timestamp: msg.timestamp,
          isRead: msg.isRead,
          type: msg.type as Message["type"],
          parentId: msg.parentId,
        })),
        type: "PERSONAL" as const,
        isDeleted: false, // Personal conversations don't have deletedAt
      }
    })
  )

  // Map groups to Contact format
  const groupContacts: Contact[] = await Promise.all(
    groupsResult.data.map(async (groupData) => {
      // Fetch messages for each group
      const messages = await getMessagesForGroupCached(groupData.id, currentUserId, 100)

      const group: Group = {
        id: groupData.id,
        name: groupData.name,
        description: groupData.description || undefined,
        avatar: groupData.avatar || undefined,
        createdById: groupData.createdById,
        createdAt: groupData.createdAt,
        updatedAt: groupData.updatedAt,
        members: groupData.members,
        memberCount: groupData.memberCount,
      }

      return {
        id: groupData.id,
        name: groupData.name,
        image: groupData.avatar,
        lastMessage: groupData.lastMessage?.content || "",
        lastMessageTime: groupData.lastMessage?.createdAt || groupData.updatedAt,
        unreadCount: 0, // TODO: Calculate unread count for groups
        isOnline: false,
        messages: messages.map((msg): Message => ({
          id: msg.id,
          content: msg.content,
          subject: msg.subject,
          senderId: msg.senderId,
          receiverId: msg.receiverId,
          groupId: msg.groupId || null,
          timestamp: msg.timestamp,
          isRead: msg.isRead,
          type: msg.type as Message["type"],
          parentId: msg.parentId,
        })),
        type: "GROUP" as const,
        group,
        isDeleted: !!groupData.deletedAt, // Set based on group.deletedAt from query
      }
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

