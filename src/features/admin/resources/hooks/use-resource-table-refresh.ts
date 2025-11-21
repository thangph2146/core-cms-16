import { useCallback, useEffect, useRef } from "react"
import type { QueryClient, QueryKey } from "@tanstack/react-query"
import { logger } from "@/lib/config"

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
        logger.debug("[useResourceTableRefresh] refreshRef.current START", { 
          hasInvalidateKey: !!invalidateKey,
          invalidateKey: invalidateKey ? JSON.stringify(invalidateKey) : undefined,
        })
        
        if (invalidateKey) {
          // Invalidate queries nhưng KHÔNG tự động refetch (refetchType: "none")
          // Điều này chỉ clear cache, không trigger refetch
          // refreshFn() sẽ trigger refetch query hiện tại khi table reload
          logger.debug("[useResourceTableRefresh] Invalidating queries", { invalidateKey: JSON.stringify(invalidateKey) })
          await queryClient.invalidateQueries({ queryKey: invalidateKey, refetchType: "none" })
          logger.debug("[useResourceTableRefresh] Queries invalidated")
        }
        
        // Gọi refreshFn để trigger reload trong table (sẽ refetch query hiện tại)
        logger.debug("[useResourceTableRefresh] Calling refreshFn()")
        refreshFn()
        logger.debug("[useResourceTableRefresh] refreshFn() completed")
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

    logger.debug("[useResourceTableRefresh] cacheVersion changed", { cacheVersion })

    if (softRefreshRef.current) {
      logger.debug("[useResourceTableRefresh] Triggering soft refresh from cacheVersion")
      softRefreshRef.current()
      pendingRealtimeRefreshRef.current = false
    } else {
      logger.debug("[useResourceTableRefresh] softRefreshRef not ready, marking pending")
      pendingRealtimeRefreshRef.current = true
    }
  }, [cacheVersion])

  return { onRefreshReady, refresh, softRefresh }
}


