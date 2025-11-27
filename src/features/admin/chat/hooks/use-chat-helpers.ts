import type { Contact, Message } from "@/components/chat/types"
import { TEXTAREA_MIN_HEIGHT, BASE_OFFSET_REM, REM_TO_PX } from "@/components/chat/constants"
import { isMessageUnreadByUser, isMessageReadByUser } from "@/components/chat/utils/message-helpers"
import { withApiBase } from "@/lib/config/api-paths"
import { requestJson } from "@/lib/api/client"

const ESTIMATED_REPLY_BANNER_HEIGHT = 48
const ADJUSTMENT_PX = 5
const MARK_AS_READ_DEBOUNCE_MS = 300
const MOBILE_BREAKPOINT = 768

function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false
  return window.innerWidth < MOBILE_BREAKPOINT
}

function calculateBaseHeight(): number {
  return window.innerHeight - (BASE_OFFSET_REM * REM_TO_PX)
}

export function calculateMessagesHeight(params: {
  textareaHeight: number
  replyingTo: Message | null
  replyBannerRef?: React.RefObject<HTMLDivElement | null>
  deletedBannerRef?: React.RefObject<HTMLDivElement | null>
  isGroupDeleted?: boolean
  elementHeights?: {
    chatHeader?: number
    adminHeader?: number
    replyBanner?: number
    deletedBanner?: number
    chatInput?: number
  }
}): { maxHeight: number; minHeight: number } {
  const { 
    textareaHeight, 
    replyingTo, 
    replyBannerRef, 
    deletedBannerRef, 
    isGroupDeleted = false,
    elementHeights,
  } = params
  const isMobile = isMobileViewport()
  let baseHeight = calculateBaseHeight()
  
  // Subtract 50px from baseHeight for desktop to account for header and spacing
  if (!isMobile) {
    baseHeight -= 50
  }
  
  const textareaExtraHeight = Math.max(0, textareaHeight - TEXTAREA_MIN_HEIGHT)

  // Use measured heights from hook if available, otherwise fallback to refs
  const replyBannerHeight = replyingTo && !isGroupDeleted
    ? (elementHeights?.replyBanner ?? replyBannerRef?.current?.offsetHeight ?? ESTIMATED_REPLY_BANNER_HEIGHT)
    : 0

  const deletedBannerHeight = isGroupDeleted
    ? (elementHeights?.deletedBanner ?? deletedBannerRef?.current?.offsetHeight ?? 40)
    : 0

  // On mobile, use fixed height of 717px regardless of textarea height
  if (isMobile) {
    const height = 717
    return { maxHeight: height, minHeight: height }
  }

  // Desktop: calculate height based on textarea and banners
  // Also subtract chat header and admin header heights if provided
  const chatHeaderHeight = elementHeights?.chatHeader ?? 0
  const adminHeaderHeight = elementHeights?.adminHeader ?? 0
  const chatInputHeight = elementHeights?.chatInput ?? textareaHeight
  
  const totalExtraHeight = 
    textareaExtraHeight + 
    replyBannerHeight + 
    deletedBannerHeight + 
    chatHeaderHeight + 
    adminHeaderHeight +
    (chatInputHeight - TEXTAREA_MIN_HEIGHT) +
    ADJUSTMENT_PX
    
  const height = Math.max(0, baseHeight - totalExtraHeight)

  return { maxHeight: height, minHeight: height }
}

async function markConversationAsReadAPI(contactId: string, contactType?: "PERSONAL" | "GROUP"): Promise<void> {
  try {
    const { apiRoutes } = await import("@/lib/api/routes")
    // For groups: use group mark-read endpoint; personal uses conversations
    const endpoint = withApiBase(
      contactType === "GROUP"
        ? apiRoutes.adminGroups.markRead(contactId)
        : apiRoutes.adminConversations.markRead(contactId)
    )
    
    const res = await requestJson(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    })
    if (!res.ok) {
      const { logger } = await import("@/lib/config")
      logger.error("Failed to mark conversation as read", { contactId, contactType, status: res.status })
    }
  } catch (error) {
    const { logger } = await import("@/lib/config")
    logger.error("Error auto-marking conversation as read", error)
  }
}

export function debouncedMarkAsRead(contactId: string, contactType?: "PERSONAL" | "GROUP"): void {
  setTimeout(() => markConversationAsReadAPI(contactId, contactType), MARK_AS_READ_DEBOUNCE_MS)
}

export function getUnreadMessages(contact: Contact, currentUserId: string): Message[] {
  return contact.messages.filter((msg) => {
    // For personal messages: also check receiverId
    if (!msg.groupId && msg.receiverId !== currentUserId) return false
    return isMessageUnreadByUser(msg, currentUserId)
  })
}

export function calculateUnreadCount(contact: Contact, currentUserId: string): number {
  return getUnreadMessages(contact, currentUserId).length
}

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
