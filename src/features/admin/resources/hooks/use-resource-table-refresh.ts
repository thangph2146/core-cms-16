import { useCallback, useEffect, useRef } from "react"
import type { QueryClient, QueryKey } from "@tanstack/react-query"
import { logger } from "@/lib/config/logger"

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
 * 
 * @example
 * ```tsx
 * const { onRefreshReady, refresh, softRefresh } = useResourceTableRefresh({
 *   queryClient,
 *   getInvalidateQueryKey: () => queryKeys.adminTags.all(),
 *   cacheVersion: socketBridge.cacheVersion,
 * })
 * ```
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
    if (!refreshRef.current) {
      logger.warn("Refresh function not ready yet")
      return
    }
    logger.debug("Triggering full refresh")
    await refreshRef.current()
  }, [])

  const softRefresh = useCallback(() => {
    if (!softRefreshRef.current) {
      logger.debug("Soft refresh function not ready, marking as pending")
      pendingRealtimeRefreshRef.current = true
      return
    }
    logger.debug("Triggering soft refresh")
    softRefreshRef.current()
  }, [])

  const onRefreshReady = useCallback(
    (refreshFn: () => void) => {
      softRefreshRef.current = refreshFn
      refreshRef.current = async () => {
        const invalidateKey = getInvalidateQueryKey?.()
        if (invalidateKey) {
          logger.debug("Invalidating queries before refresh", { queryKey: invalidateKey })
          // Invalidate queries nhưng KHÔNG tự động refetch (refetchType: "none")
          // refreshFn() sẽ trigger refetch query hiện tại khi table reload
          await queryClient.invalidateQueries({ queryKey: invalidateKey, refetchType: "none" })
        }
        refreshFn()
      }

      if (pendingRealtimeRefreshRef.current) {
        logger.debug("Executing pending soft refresh")
        pendingRealtimeRefreshRef.current = false
        refreshFn()
      }
    },
    [getInvalidateQueryKey, queryClient],
  )

  useEffect(() => {
    if (!cacheVersion) return

    logger.debug("Cache version changed, triggering soft refresh", { cacheVersion })

    if (softRefreshRef.current) {
      softRefreshRef.current()
      pendingRealtimeRefreshRef.current = false
    } else {
      pendingRealtimeRefreshRef.current = true
    }
  }, [cacheVersion])

  return { onRefreshReady, refresh, softRefresh }
}
