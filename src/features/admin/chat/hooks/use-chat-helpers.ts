/**
 * Helper functions cho useChat hook
 * Tách logic để code ngắn gọn và dễ maintain
 */

import type { Contact, Message } from "@/components/chat/types"
import { TEXTAREA_MIN_HEIGHT, BASE_OFFSET_REM, REM_TO_PX } from "@/components/chat/constants"
import { isMessageUnreadByUser, isMessageReadByUser } from "@/components/chat/utils/message-helpers"

const ESTIMATED_REPLY_BANNER_HEIGHT = 48
const ADJUSTMENT_PX = 5
const MARK_AS_READ_DEBOUNCE_MS = 300

/**
 * Tính toán base height cho messages area
 * Internal helper - not exported
 */
function calculateBaseHeight(): number {
  return window.innerHeight - (BASE_OFFSET_REM * REM_TO_PX)
}

/**
 * Tính toán height cho messages area
 */
export function calculateMessagesHeight(params: {
  textareaHeight: number
  replyingTo: Message | null
  replyBannerRef: React.RefObject<HTMLDivElement | null>
  deletedBannerRef?: React.RefObject<HTMLDivElement | null>
  isGroupDeleted?: boolean
}): { maxHeight: number; minHeight: number } {
  const { textareaHeight, replyingTo, replyBannerRef, deletedBannerRef, isGroupDeleted = false } = params
  const baseHeight = calculateBaseHeight()
  const textareaExtraHeight = Math.max(0, textareaHeight - TEXTAREA_MIN_HEIGHT)

  // Measure actual reply banner height
  const replyBannerHeight = replyingTo && !isGroupDeleted
    ? replyBannerRef.current?.offsetHeight || ESTIMATED_REPLY_BANNER_HEIGHT
    : 0

  // Measure actual deleted banner height
  const deletedBannerHeight = isGroupDeleted && deletedBannerRef?.current
    ? deletedBannerRef.current.offsetHeight
    : isGroupDeleted
    ? 40 // Fallback estimate
    : 0

  const totalExtraHeight = textareaExtraHeight + replyBannerHeight + deletedBannerHeight + ADJUSTMENT_PX
  const height = Math.max(0, baseHeight - totalExtraHeight)

  return { maxHeight: height, minHeight: height }
}

/**
 * Mark conversation as read via API
 * Internal helper - not exported
 * Handles both personal conversations and groups
 */
async function markConversationAsReadAPI(contactId: string, contactType?: "PERSONAL" | "GROUP"): Promise<void> {
  try {
    // For groups: use group mark-read endpoint
    // For personal: use conversation mark-read endpoint
    const endpoint = contactType === "GROUP"
      ? `/api/admin/groups/${contactId}/mark-read`
      : `/api/admin/conversations/${contactId}/mark-read`
    
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    })
    if (!response.ok) {
      const { logger } = await import("@/lib/config")
      logger.error("Failed to mark conversation as read", { contactId, contactType, status: response.status })
    }
  } catch (error) {
    const { logger } = await import("@/lib/config")
    logger.error("Error auto-marking conversation as read", error)
  }
}

/**
 * Debounced mark conversation as read
 */
export function debouncedMarkAsRead(contactId: string, contactType?: "PERSONAL" | "GROUP"): void {
  setTimeout(() => markConversationAsReadAPI(contactId, contactType), MARK_AS_READ_DEBOUNCE_MS)
}

/**
 * Get unread messages for a contact
 * Uses isMessageUnreadByUser helper for consistent logic
 */
export function getUnreadMessages(contact: Contact, currentUserId: string): Message[] {
  return contact.messages.filter((msg) => {
    // For personal messages: also check receiverId
    if (!msg.groupId && msg.receiverId !== currentUserId) return false
    return isMessageUnreadByUser(msg, currentUserId)
  })
}

/**
 * Calculate unread count for a contact
 * Uses getUnreadMessages for consistent logic
 */
export function calculateUnreadCount(contact: Contact, currentUserId: string): number {
  return getUnreadMessages(contact, currentUserId).length
}

/**
 * Check if messages changed (including isRead status and readers array)
 */
export function hasMessagesChanged(oldMessages: Message[], newMessages: Message[], currentUserId?: string): boolean {
  if (oldMessages.length !== newMessages.length) return true
  if (oldMessages[oldMessages.length - 1]?.id !== newMessages[newMessages.length - 1]?.id) return true
  
  // Check if any message's read status changed (using helper for consistency)
  if (!currentUserId) {
    // Fallback to isRead comparison if no currentUserId
    return oldMessages.some((oldMsg, idx) => {
      const newMsg = newMessages[idx]
      return newMsg && newMsg.id === oldMsg.id && newMsg.isRead !== oldMsg.isRead
    })
  }
  
  return oldMessages.some((oldMsg, idx) => {
    const newMsg = newMessages[idx]
    if (!newMsg || newMsg.id !== oldMsg.id) return false
    const oldRead = isMessageReadByUser(oldMsg, currentUserId)
    const newRead = isMessageReadByUser(newMsg, currentUserId)
    return oldRead !== newRead
  })
}
