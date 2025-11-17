/**
 * Hook để lấy tổng số tin nhắn và thông báo chưa đọc
 */

import { useQuery } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { apiClient } from "@/lib/api/axios"
import { apiRoutes } from "@/lib/api/routes"
import { queryKeys } from "@/lib/query-keys"

export interface UnreadCountsResponse {
  unreadMessages: number
  unreadNotifications: number
}

export function useUnreadCounts(options?: {
  refetchInterval?: number
  enabled?: boolean
}) {
  const { data: session } = useSession()
  const { refetchInterval = 30000, enabled = true } = options || {}

  return useQuery<UnreadCountsResponse>({
    queryKey: queryKeys.unreadCounts.user(session?.user?.id),
    queryFn: async () => {
      const response = await apiClient.get<{
        success: boolean
        data?: UnreadCountsResponse
        error?: string
        message?: string
      }>(apiRoutes.unreadCounts.get)

      const payload = response.data.data
      if (!payload) {
        throw new Error(response.data.error || response.data.message || "Không thể tải số lượng chưa đọc")
      }

      return payload
    },
    enabled: enabled && !!session?.user?.id,
    refetchInterval,
    staleTime: 10000, // 10 seconds
  })
}

