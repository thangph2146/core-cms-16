/**
 * Helper functions cho socket bridge operations
 * Tách logic để code ngắn gọn và dễ test
 */

import type { Contact } from "@/components/chat/types"

/**
 * Update contact message isRead status
 */
export function updateMessageReadStatus(
  contacts: Contact[],
  contactId: string,
  messageId: string | undefined,
  isRead: boolean
): Contact[] {
  if (!messageId) return contacts
  return contacts.map((contact) => {
    if (contact.id !== contactId) return contact

    const messageIndex = contact.messages.findIndex((msg) => msg.id === messageId)
    if (messageIndex === -1) return contact
    
    const currentMessage = contact.messages[messageIndex]
    const wasUnread = !currentMessage.isRead
    const isNowRead = isRead

    const updatedMessages = [...contact.messages]
    updatedMessages[messageIndex] = { ...currentMessage, isRead: isNowRead }

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