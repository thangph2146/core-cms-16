/**
 * Helper functions cho socket bridge operations
 * Tách logic để code ngắn gọn và dễ test
 */

import type { Contact } from "@/components/chat/types"
import { applyReadStatus } from "./use-chat-message-helpers"

/**
 * Update contact message isRead status and readers array
 */
export function updateMessageReadStatus(
  contacts: Contact[],
  contactId: string,
  messageId: string | undefined,
  isRead: boolean,
  readers: { id: string; name: string | null; email: string; avatar: string | null }[] | undefined,
  currentUserId: string | undefined
): Contact[] {
  if (!messageId || !currentUserId) return contacts
  return applyReadStatus(contacts, {
    contactId,
    messageId,
    isRead,
    readers,
    currentUserId,
    mode: "socket",
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
