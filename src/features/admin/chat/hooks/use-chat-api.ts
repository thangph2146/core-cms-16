/**
 * API functions cho chat
 * Tách API calls để dễ test và maintain
 */

import { toast } from "@/hooks/use-toast"

/**
 * Parse API error response
 * Internal helper - not exported
 */
async function parseErrorResponse(response: Response, defaultMessage: string): Promise<string> {
  try {
    const errorData = await response.json()
    return errorData.error || defaultMessage
  } catch {
    return defaultMessage
  }
}

/**
 * Mark message as read/unread
 */
export async function markMessageAPI(messageId: string, isRead: boolean): Promise<void> {
  const { apiRoutes } = await import("@/lib/api/routes")
  const response = await fetch(`/api${apiRoutes.adminMessages.markRead(messageId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isRead }),
  })

  if (!response.ok) {
    const defaultMessage = isRead ? "Không thể đánh dấu đã đọc" : "Không thể đánh dấu chưa đọc"
    const errorMessage = await parseErrorResponse(response, defaultMessage)
    throw new Error(errorMessage)
  }
}

/**
 * Send message via API
 */
export async function sendMessageAPI(params: {
  content: string
  receiverId?: string
  groupId?: string
  parentId?: string
}): Promise<{ id: string; timestamp: string }> {
  const { apiRoutes } = await import("@/lib/api/routes")
  const response = await fetch(`/api${apiRoutes.adminMessages.send}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: params.content,
      receiverId: params.receiverId,
      groupId: params.groupId,
      parentId: params.parentId,
      type: "PERSONAL",
    }),
  })

  if (!response.ok) {
    const errorMessage = await parseErrorResponse(response, "Không thể gửi tin nhắn")
    throw new Error(errorMessage)
  }

  return response.json()
}

/**
 * Handle API error với toast
 */
export function handleAPIError(error: unknown, defaultMessage: string): void {
  // Use dynamic import to avoid require()
  import("@/lib/config").then(({ logger }) => {
    logger.error(defaultMessage, error)
  })
  const errorMessage = error instanceof Error ? error.message : defaultMessage
  toast({
    title: "Lỗi",
    description: errorMessage,
    variant: "destructive",
  })
}