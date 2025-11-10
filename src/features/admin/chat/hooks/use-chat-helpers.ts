/**
 * Helper functions cho useChat hook
 * Tách logic để code ngắn gọn và dễ maintain
 */

import type { Contact, Message } from "@/components/chat/types"
import { TEXTAREA_MIN_HEIGHT, BASE_OFFSET_REM, REM_TO_PX } from "@/components/chat/constants"

const ESTIMATED_REPLY_BANNER_HEIGHT = 48
const ADJUSTMENT_PX = 5
const MARK_AS_READ_DEBOUNCE_MS = 300

/**
 * Tính toán base height cho messages area
 */
export function calculateBaseHeight(): number {
  return window.innerHeight - (BASE_OFFSET_REM * REM_TO_PX)
}

/**
 * Tính toán height cho messages area
 */
export function calculateMessagesHeight(params: {
  textareaHeight: number
  replyingTo: Message | null
  replyBannerRef: React.RefObject<HTMLDivElement | null>
}): { maxHeight: number; minHeight: number } {
  const { textareaHeight, replyingTo, replyBannerRef } = params
  const baseHeight = calculateBaseHeight()
  const textareaExtraHeight = Math.max(0, textareaHeight - TEXTAREA_MIN_HEIGHT)
  
  // Measure actual reply banner height
  let replyBannerHeight = 0
  if (replyingTo) {
    replyBannerHeight = replyBannerRef.current?.offsetHeight || ESTIMATED_REPLY_BANNER_HEIGHT
  }
  
  const totalExtraHeight = textareaExtraHeight + replyBannerHeight + ADJUSTMENT_PX
  const height = Math.max(0, baseHeight - totalExtraHeight)
  
  return { maxHeight: height, minHeight: height }
}

/**
 * Mark conversation as read via API
 */
export async function markConversationAsReadAPI(contactId: string): Promise<void> {
  try {
    const response = await fetch(`/api/admin/conversations/${contactId}/mark-read`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    })
    if (!response.ok) {
      console.error("Failed to mark conversation as read:", await response.text())
    }
  } catch (error) {
    console.error("Error auto-marking conversation as read:", error)
  }
}

/**
 * Debounced mark conversation as read
 */
export function debouncedMarkAsRead(contactId: string): void {
  setTimeout(() => markConversationAsReadAPI(contactId), MARK_AS_READ_DEBOUNCE_MS)
}

/**
 * Get unread messages for a contact
 */
export function getUnreadMessages(contact: Contact, currentUserId: string): Message[] {
  return contact.messages.filter((msg) => msg.receiverId === currentUserId && !msg.isRead)
}

/**
 * Check if messages changed
 */
export function hasMessagesChanged(oldMessages: Message[], newMessages: Message[]): boolean {
  return (
    oldMessages.length !== newMessages.length ||
    oldMessages[oldMessages.length - 1]?.id !== newMessages[newMessages.length - 1]?.id
  )
}

