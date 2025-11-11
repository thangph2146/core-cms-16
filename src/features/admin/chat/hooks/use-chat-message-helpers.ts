/**
 * Helper functions cho message operations trong useChat
 * Tách logic để code ngắn gọn và dễ test
 */

import type { Contact, Message } from "@/components/chat/types"
import { calculateUnreadCount } from "./use-chat-helpers"

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
  return applyReadStatus(contacts, {
    contactId,
    messageId,
    isRead,
    mode: "optimistic",
    currentUserId,
  })
}

/**
 * Shared helper: apply read status changes (socket or optimistic)
 */
export function applyReadStatus(
  contacts: Contact[],
  params: {
    contactId: string
    messageId: string
    isRead: boolean
    currentUserId: string
    readers?: { id: string; name: string | null; email: string; avatar: string | null }[]
    mode: "socket" | "optimistic"
  }
): Contact[] {
  const { contactId, messageId, isRead, readers, currentUserId, mode } = params
  return contacts.map((contact) => {
    if (contact.id !== contactId) return contact

    const idx = contact.messages.findIndex((m) => m.id === messageId)
    if (idx === -1) return contact

    const prev = contact.messages[idx]
    let next: Message = prev
    const isGroupMessage = !!prev.groupId

    if (mode === "socket") {
      // Socket payloads provide readers for group; update isRead for personal
      next = {
        ...prev,
        ...(isGroupMessage && readers ? { readers } : {}),
        ...(!isGroupMessage ? { isRead } : {}),
      }
    } else {
      // Optimistic: only update isRead for personal; leave group to socket
      next = {
        ...prev,
        ...(!isGroupMessage ? { isRead } : {}),
      }
    }

    const updatedMessages = [...contact.messages]
    updatedMessages[idx] = next

    const contactWithUpdates: Contact = {
      ...contact,
      messages: updatedMessages,
    }

    return {
      ...contactWithUpdates,
      unreadCount: calculateUnreadCount(contactWithUpdates, currentUserId),
    }
  })
}
