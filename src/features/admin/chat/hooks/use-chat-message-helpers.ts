import type { Contact, Message } from "@/components/chat/types"
import { MAX_MESSAGES_IN_STATE } from "@/components/chat/constants"
import { calculateUnreadCount } from "./use-chat-helpers"

export function createOptimisticMessage(params: {
  content: string
  senderId: string
  receiverId: string | null
  groupId: string | null
  parentId?: string | null
}): Message {
  const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`
  return {
    id: tempId,
    content: params.content,
    senderId: params.senderId,
    receiverId: params.receiverId,
    groupId: params.groupId,
    timestamp: new Date(),
    isRead: false,
    type: "PERSONAL",
    parentId: params.parentId || null,
    status: "sending",
    clientMessageId: tempId,
  }
}

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

export function removeContactMessage(
  contacts: Contact[],
  contactId: string,
  messageId: string
): Contact[] {
  return updateContactMessages(contacts, contactId, (messages) =>
    messages.filter((msg) => msg.id !== messageId)
  )
}

export function addContactMessage(
  contacts: Contact[],
  contactId: string,
  message: Message
): Contact[] {
  return contacts.map((contact) => {
    if (contact.id !== contactId) return contact

    const newMessages = [...contact.messages, message]
    // Giới hạn số lượng tin nhắn, giữ lại tin nhắn mới nhất
    // Nếu vượt quá MAX_MESSAGES_IN_STATE, xóa tin nhắn cũ nhất
    const limitedMessages = newMessages.length > MAX_MESSAGES_IN_STATE
      ? newMessages.slice(-MAX_MESSAGES_IN_STATE) // Giữ lại MAX_MESSAGES_IN_STATE tin nhắn mới nhất
      : newMessages

    return {
      ...contact,
      messages: limitedMessages,
      lastMessage: message.content,
      lastMessageTime: message.timestamp,
    }
  })
}

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
