/**
 * Cache Functions for Messages/Chat
 * 
 * Sử dụng React cache() để:
 * - Tự động deduplicate requests trong cùng một render pass
 * - Cache kết quả để tái sử dụng
 * - Cải thiện performance với request deduplication
 */

import { cache } from "react"
import { listConversations, getMessagesBetweenUsers, getMessageById, listGroups, getMessagesForGroup, type ListConversationsInput, type ListConversationsResult, type ListGroupsInput, type MessageDetail } from "./queries"

/**
 * Cache function: List conversations
 */
export const listConversationsCached = cache(async (params: ListConversationsInput): Promise<ListConversationsResult> => {
  return listConversations(params)
})

/**
 * Cache function: Get messages between two users
 */
export const getMessagesBetweenUsersCached = cache(async (userId: string, otherUserId: string, limit: number = 100): Promise<MessageDetail[]> => {
  return getMessagesBetweenUsers(userId, otherUserId, limit)
})

/**
 * Cache function: Get message by ID
 */
export const getMessageByIdCached = cache(async (id: string): Promise<MessageDetail | null> => {
  return getMessageById(id)
})

/**
 * Cache function: List groups
 */
export const listGroupsCached = cache(async (params: ListGroupsInput) => {
  return listGroups(params)
})

/**
 * Cache function: Get messages for a group
 */
export const getMessagesForGroupCached = cache(async (groupId: string, userId: string, limit: number = 100): Promise<MessageDetail[]> => {
  return getMessagesForGroup(groupId, userId, limit)
})

