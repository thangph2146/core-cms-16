import { toast } from "@/hooks/use-toast"
import { requestJson, toJsonBody } from "@/lib/api/client"
import { withApiBase } from "@/lib/config/api-paths"

// Kept for reference when using raw fetch in other areas
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function parseErrorResponse(response: Response, defaultMessage: string): Promise<string> {
  try {
    const errorData = await response.json()
    return errorData.error || defaultMessage
  } catch {
    return defaultMessage
  }
}

export async function markMessageAPI(messageId: string, isRead: boolean): Promise<void> {
  const { apiRoutes } = await import("@/lib/api/routes")
  const res = await requestJson(withApiBase(apiRoutes.adminMessages.markRead(messageId)), {
    method: "PATCH",
    ...toJsonBody({ isRead }),
  })
  if (!res.ok) {
    throw new Error(res.error || (isRead ? "Không thể đánh dấu đã đọc" : "Không thể đánh dấu chưa đọc"))
  }
}

export async function sendMessageAPI(params: {
  content: string
  receiverId?: string
  groupId?: string
  parentId?: string
}): Promise<{ id: string; timestamp: string }> {
  const { apiRoutes } = await import("@/lib/api/routes")
  const res = await requestJson<{ id: string; timestamp: string }>(withApiBase(apiRoutes.adminMessages.send), {
    method: "POST",
    ...toJsonBody({
      content: params.content,
      receiverId: params.receiverId,
      groupId: params.groupId,
      parentId: params.parentId,
      type: "PERSONAL",
    }),
  })
  if (!res.ok || !res.data) {
    throw new Error(res.error || "Không thể gửi tin nhắn")
  }
  return res.data
}

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
