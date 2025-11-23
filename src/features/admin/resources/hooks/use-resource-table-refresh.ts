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
  const lastCacheVersionRef = useRef<number | undefined>(undefined)

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
          // Invalidate và refetch queries - Next.js 16 pattern: đảm bảo data fresh
          // Refetch ngay để đảm bảo table hiển thị data mới ngay sau mutations
          await queryClient.invalidateQueries({ queryKey: invalidateKey, refetchType: "active" })
          await queryClient.refetchQueries({ queryKey: invalidateKey, type: "active" })
        }
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
    // Chỉ trigger khi cacheVersion thực sự thay đổi (tránh duplicate trong React Strict Mode)
    if (!cacheVersion || cacheVersion === lastCacheVersionRef.current) return

    lastCacheVersionRef.current = cacheVersion
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
