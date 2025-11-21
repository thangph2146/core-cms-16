import { useCallback, useEffect, useRef } from "react"
import type { QueryClient, QueryKey } from "@tanstack/react-query"

interface UseResourceTableRefreshOptions {
  queryClient: QueryClient
  /**
   * Hàm tạo queryKey cần invalidate trước khi refresh (ví dụ queryKeys.adminTags.all)
   */
  getInvalidateQueryKey?: () => QueryKey
  /**
   * Version từ socket bridge để trigger soft refresh
   */
  cacheVersion?: number
}

interface UseResourceTableRefreshResult {
  /**
   * Truyền trực tiếp vào props onRefreshReady của ResourceTableClient
   */
  onRefreshReady: (refresh: () => void) => void
  /**
   * Trigger refresh đầy đủ (invalidate + reload)
   */
  refresh: () => Promise<void>
  /**
   * Trigger soft refresh (không invalidate cache)
   */
  softRefresh: () => void
}

/**
 * Quản lý vòng đời refresh cho ResourceTableClient
 * - Tự động invalidate query trước khi refresh
 * - Hỗ trợ soft refresh khi có realtime updates
 * - Giữ refresh function để dùng cho các mutation callbacks
 */
export function useResourceTableRefresh({
  queryClient,
  getInvalidateQueryKey,
  cacheVersion,
}: UseResourceTableRefreshOptions): UseResourceTableRefreshResult {
  const refreshRef = useRef<(() => void) | null>(null)
  const softRefreshRef = useRef<(() => void) | null>(null)
  const pendingRealtimeRefreshRef = useRef(false)

  const refresh = useCallback(async () => {
    await refreshRef.current?.()
  }, [])

  const softRefresh = useCallback(() => {
    softRefreshRef.current?.()
  }, [])

  const onRefreshReady = useCallback(
    (refreshFn: () => void) => {
      softRefreshRef.current = refreshFn
      refreshRef.current = async () => {
        const invalidateKey = getInvalidateQueryKey?.()
        if (invalidateKey) {
          // Invalidate và refetch tất cả queries (kể cả inactive) để đảm bảo data mới nhất
          // Sử dụng refetchType: "all" để refetch cả active và inactive queries
          await queryClient.invalidateQueries({ queryKey: invalidateKey, refetchType: "all" })
          // Đảm bảo refetch được thực hiện ngay lập tức
          await queryClient.refetchQueries({ queryKey: invalidateKey, type: "all" })
        }
        // Gọi refreshFn để trigger reload trong table
        refreshFn()
      }

      if (pendingRealtimeRefreshRef.current) {
        pendingRealtimeRefreshRef.current = false
        refreshFn()
      }
    },
    [getInvalidateQueryKey, queryClient],
  )

  useEffect(() => {
    if (!cacheVersion) return

    if (softRefreshRef.current) {
      softRefreshRef.current()
      pendingRealtimeRefreshRef.current = false
    } else {
      pendingRealtimeRefreshRef.current = true
    }
  }, [cacheVersion])

  return { onRefreshReady, refresh, softRefresh }
}


