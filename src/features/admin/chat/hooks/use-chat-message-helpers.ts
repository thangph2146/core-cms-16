/**
 * Helper functions cho message operations trong useChat
 * Tách logic để code ngắn gọn và dễ test
 */

import type { Contact, Message } from "@/components/chat/types"
import { isMessageReadByUser } from "@/components/chat/utils/message-helpers"

/**
 * Create optimistic message
 */
export function createOptimisticMessage(params: {
  content: string
  senderId: string
  receiverId: string | null
  groupId: string | null
  parentId?: string | null
}): Message {
  return {
    id: `temp-${Date.now()}`,
    content: params.content,
    senderId: params.senderId,
    receiverId: params.receiverId,
    groupId: params.groupId,
    timestamp: new Date(),
    isRead: false,
    type: "PERSONAL",
    parentId: params.parentId || null,
  }
}

/**
 * Update contact messages (add, update, or remove)
 * Internal helper - not exported
 */
function updateContactMessages(
  contacts: Contact[],
  contactId: string,
  updater: (messages: Message[]) => Message[]
): Contact[] {
  return contacts.map((contact) =>
    contact.id === contactId
      ? { ...contact, messages: updater(contact.messages) }
      : contact
  )
}

/**
 * Update contact message by ID
 */
export function updateContactMessage(
  contacts: Contact[],
  contactId: string,
  messageId: string,
  updater: (message: Message) => Message
): Contact[] {
  return updateContactMessages(contacts, contactId, (messages) =>
    messages.map((msg) => (msg.id === messageId ? updater(msg) : msg))
  )
}

/**
 * Remove message from contact
 */
export function removeContactMessage(
  contacts: Contact[],
  contactId: string,
  messageId: string
): Contact[] {
  return updateContactMessages(contacts, contactId, (messages) =>
    messages.filter((msg) => msg.id !== messageId)
  )
}

/**
 * Add message to contact
 */
export function addContactMessage(
  contacts: Contact[],
  contactId: string,
  message: Message
): Contact[] {
  return contacts.map((contact) =>
    contact.id === contactId
      ? {
          ...contact,
          messages: [...contact.messages, message],
          lastMessage: message.content,
          lastMessageTime: message.timestamp,
        }
      : contact
  )
}

/**
 * Update message read status with optimistic update
 * Handles both group (readers array) and personal (isRead boolean) messages
 */
export function updateMessageReadStatusOptimistic(
  contacts: Contact[],
  contactId: string,
  messageId: string,
  isRead: boolean,
  currentUserId: string
): Contact[] {
  return contacts.map((contact) => {
    if (contact.id !== contactId) return contact
    
    const message = contact.messages.find((m) => m.id === messageId)
    if (!message) return contact
    
    // Check current read status using helper
    const wasRead = isMessageReadByUser(message, currentUserId)
    if (wasRead === isRead) return contact // No change needed
    
    // Update message based on type
    const isGroupMessage = !!message.groupId
    const updatedMessage = isGroupMessage
      ? message // For group messages, readers array is updated via socket
      : { ...message, isRead }
    
    return {
      ...contact,
      messages: contact.messages.map((m) => (m.id === messageId ? updatedMessage : m)),
      unreadCount: isRead
        ? Math.max(0, contact.unreadCount - 1)
        : contact.unreadCount + 1,
    }
  })
}

