/**
 * Helper functions cho message operations
 */

import type { Message } from "../types"

/**
 * Filter messages by search query
 */
export function filterMessagesByQuery(messages: Message[], query: string): Message[] {
  if (!query.trim()) return messages
  
  const lowerQuery = query.toLowerCase()
  return messages.filter((msg) => msg.content.toLowerCase().includes(lowerQuery))
}

/**
 * Create message map for quick parent lookup
 */
export function createMessageMap(messages: Message[]): Map<string, Message> {
  const map = new Map<string, Message>()
  messages.forEach((msg) => map.set(msg.id, msg))
  return map
}

/**
 * Get parent message from map
 */
export function getParentMessage(
  message: Message,
  messageMap: Map<string, Message>
): Message | null {
  return message.parentId ? messageMap.get(message.parentId) || null : null
}

/**
 * Deduplicate messages by ID (tránh duplicate key error trong React)
 */
export function deduplicateMessages(messages: Message[]): Message[] {
  return messages.filter((msg, index, self) => 
    index === self.findIndex((m) => m.id === msg.id)
  )
}

/**
 * Check if message is read by current user
 * For group messages: check if current user is in readers array
 * For personal messages: check isRead boolean
 */
export function isMessageReadByUser(message: Message, currentUserId: string | null | undefined): boolean {
  if (!currentUserId) return false
  
  // For group messages: check readers array
  if (message.groupId && message.readers) {
    return message.readers.some((reader) => reader.id === currentUserId)
  }
  
  // For personal messages: check isRead boolean
  return message.isRead
}

/**
 * Check if message is unread by current user
 * For group messages: check if current user is NOT in readers array and not own message
 * For personal messages: check isRead boolean
 */
export function isMessageUnreadByUser(message: Message, currentUserId: string | null | undefined): boolean {
  if (!currentUserId) return true
  
  // Don't count own messages as unread
  if (message.senderId === currentUserId) return false
  
  // For group messages: check if current user is NOT in readers array
  if (message.groupId) {
    return !(message.readers?.some((reader) => reader.id === currentUserId) ?? false)
  }
  
  // For personal messages: check isRead boolean
  return !message.isRead
}
