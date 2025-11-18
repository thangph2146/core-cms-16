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
  // Tắt polling khi có socket connection (socket sẽ handle real-time updates)
  disablePolling?: boolean
}) {
  const { data: session } = useSession()
  const { refetchInterval = 60000, enabled = true, disablePolling = false } = options || {}

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
    // Chỉ polling nếu không có socket connection (disablePolling = false)
    // Socket sẽ handle real-time updates, polling chỉ là fallback
    refetchInterval: disablePolling ? false : refetchInterval,
    // Tăng staleTime để giảm refetch không cần thiết
    // staleTime phải >= refetchInterval để tránh refetch liên tục
    staleTime: disablePolling ? 120000 : refetchInterval, // 120s nếu có socket, bằng refetchInterval nếu không
    // Tăng gcTime để cache lâu hơn
    gcTime: 5 * 60 * 1000, // 5 phút
    // Tránh refetch khi component remount hoặc window focus
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Chỉ refetch khi data thực sự stale
    refetchOnReconnect: true, // Chỉ refetch khi reconnect
  })
}

