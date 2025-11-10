/**
 * Helper functions cho ChatTemplate
 * Tách logic để code ngắn gọn và dễ test
 */

import type { Contact, Group, GroupRole } from "@/components/chat/types"
import { apiRoutes } from "@/lib/api/routes"

/**
 * Get current user role in a group
 */
export function getCurrentUserRole(contact: Contact | null, currentUserId: string): GroupRole | undefined {
  if (!contact || contact.type !== "GROUP" || !contact.group) return undefined
  
  const member = contact.group.members.find(
    (m) => m.userId === currentUserId && !m.leftAt
  )
  
  return member?.role
}

/**
 * Create Contact from Group
 */
export function createGroupContact(group: Group): Contact {
  return {
    id: group.id,
    name: group.name,
    image: group.avatar,
    lastMessage: "",
    lastMessageTime: group.createdAt,
    unreadCount: 0,
    isOnline: false,
    messages: [],
    type: "GROUP",
    group,
    isDeleted: false,
  }
}

/**
 * Refresh group data from API
 */
export async function refreshGroupData(groupId: string): Promise<Group | null> {
  try {
    const response = await fetch(`/api${apiRoutes.adminGroups.detail(groupId)}`)
    
    if (response.status === 404 || !response.ok) {
      return null
    }

    return await response.json()
  } catch (error) {
    const { logger } = await import("@/lib/config")
    logger.error("Error refreshing group data", error)
    return null
  }
}

/**
 * Update contact with group data
 */
export function updateContactWithGroupData(
  contacts: Contact[],
  contactId: string,
  groupData: Group
): Contact[] {
  return contacts.map((contact) => {
    if (contact.id !== contactId || contact.type !== "GROUP") return contact
    
    return {
      ...contact,
      name: groupData.name,
      image: groupData.avatar || undefined,
      group: contact.group ? {
        ...contact.group,
        name: groupData.name,
        description: groupData.description || undefined,
        avatar: groupData.avatar || undefined,
        members: groupData.members,
        memberCount: groupData.memberCount,
      } : undefined,
    }
  })
}

