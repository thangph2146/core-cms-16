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

