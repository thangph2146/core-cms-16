/**
 * Helper functions cho socket bridge operations
 * Tách logic để code ngắn gọn và dễ test
 */

import type { Contact } from "@/components/chat/types"
import { isMessageReadByUser } from "@/components/chat/utils/message-helpers"

/**
 * Update contact message isRead status and readers array
 */
export function updateMessageReadStatus(
  contacts: Contact[],
  contactId: string,
  messageId: string | undefined,
  isRead: boolean,
  readers?: { id: string; name: string | null; email: string; avatar: string | null }[],
  currentUserId?: string
): Contact[] {
  if (!messageId) return contacts
  return contacts.map((contact) => {
    if (contact.id !== contactId) return contact

    const messageIndex = contact.messages.findIndex((msg) => msg.id === messageId)
    if (messageIndex === -1) return contact
    
    const currentMessage = contact.messages[messageIndex]
    
    // Use helper function for consistent logic
    const wasUnread = currentUserId ? !isMessageReadByUser(currentMessage, currentUserId) : !currentMessage.isRead
    
    const updatedMessages = [...contact.messages]
    const isGroupMessage = currentMessage.groupId
    updatedMessages[messageIndex] = {
      ...currentMessage,
      // For group messages: update readers array, keep isRead for backward compatibility
      ...(isGroupMessage && readers ? { readers } : {}),
      // For personal messages: update isRead boolean
      ...(!isGroupMessage ? { isRead } : {}),
    }

    // Use helper function for consistent logic
    const isNowRead = currentUserId ? isMessageReadByUser(updatedMessages[messageIndex], currentUserId) : isRead

    const unreadCount = wasUnread !== !isNowRead
      ? isNowRead
        ? Math.max(0, contact.unreadCount - 1)
        : contact.unreadCount + 1
      : contact.unreadCount

    return { ...contact, messages: updatedMessages, unreadCount }
  })
}

/**
 * Update contact by ID
 */
export function updateContactInState(
  contacts: Contact[],
  contactId: string,
  updater: (contact: Contact) => Contact
): Contact[] {
  return contacts.map((contact) => (contact.id === contactId ? updater(contact) : contact))
}

/**
 * Filter contact by condition
 */
export function filterContactInState(
  contacts: Contact[],
  predicate: (contact: Contact) => boolean
): Contact[] {
  return contacts.filter(predicate)
}