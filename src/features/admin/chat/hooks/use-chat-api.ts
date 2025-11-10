/**
 * API functions cho chat
 * Tách API calls để dễ test và maintain
 */

import { apiRoutes } from "@/lib/api/routes"
import { toast } from "@/hooks/use-toast"

/**
 * Mark message as read/unread
 */
export async function markMessageAPI(
  messageId: string,
  isRead: boolean
): Promise<void> {
  const response = await fetch(`/api${apiRoutes.adminMessages.markRead(messageId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isRead }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      error: isRead ? "Không thể đánh dấu đã đọc" : "Không thể đánh dấu chưa đọc",
    }))
    throw new Error(errorData.error || `Failed to mark message as ${isRead ? "read" : "unread"}`)
  }
}

/**
 * Send message via API
 */
export async function sendMessageAPI(params: {
  content: string
  receiverId: string
  parentId?: string
}): Promise<{ id: string; timestamp: string }> {
  const { apiRoutes } = await import("@/lib/api/routes")
  const response = await fetch(`/api${apiRoutes.adminMessages.send}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: params.content,
      receiverId: params.receiverId,
      parentId: params.parentId,
      type: "PERSONAL",
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Không thể gửi tin nhắn" }))
    throw new Error(errorData.error || `Failed to send message: ${response.status}`)
  }

  return response.json()
}

/**
 * Handle API error với toast
 */
export function handleAPIError(error: unknown, defaultMessage: string): void {
  console.error(defaultMessage, error)
  const errorMessage = error instanceof Error ? error.message : defaultMessage
  toast({
    title: "Lỗi",
    description: errorMessage,
    variant: "destructive",
  })
}

