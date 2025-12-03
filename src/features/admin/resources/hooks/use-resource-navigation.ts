import { useCallback } from "react"
import type { QueryClient, QueryKey } from "@tanstack/react-query"
import { useResourceRouter, useResourceSegment } from "@/hooks/use-resource-segment"
import { applyResourceSegmentToPath } from "@/lib/permissions"
import { logger } from "@/lib/config/logger"

export interface UseResourceNavigationOptions {
  queryClient?: QueryClient
  invalidateQueryKey?: QueryKey
}

export interface UseResourceNavigationResult {
  navigateBack: (backUrl: string, onBack?: () => Promise<void> | void) => Promise<void>
  router: ReturnType<typeof useResourceRouter>
}

// Flag để prevent duplicate navigation calls
let isNavigating = false

export function useResourceNavigation({
  queryClient,
  invalidateQueryKey,
}: UseResourceNavigationOptions = {}): UseResourceNavigationResult {
  const router = useResourceRouter()
  const resourceSegment = useResourceSegment()

  const navigateBack = useCallback(
    async (backUrl: string, onBack?: () => Promise<void> | void) => {
      // Prevent duplicate navigation calls
      if (isNavigating) {
        logger.debug("⏸️ Navigation đang được xử lý, bỏ qua duplicate call", {
          backUrl,
        })
        return
      }

      isNavigating = true
      const startTime = performance.now()
      
      try {
        logger.info("🔄 Bắt đầu navigation", {
          source: "navigateBack",
          backUrl,
          resourceSegment,
          hasOnBack: !!onBack,
          hasQueryClient: !!queryClient,
          hasInvalidateKey: !!invalidateQueryKey,
        })

        // 1. Apply resource segment to backUrl trước
        const resolvedBackUrl = applyResourceSegmentToPath(backUrl, resourceSegment)
        
        // 2. Gọi custom onBack callback nếu có (để invalidate React Query cache)
        // Lưu ý: onBack callback KHÔNG nên gọi navigateBack nữa vì navigation đã được handle ở đây
        if (onBack) {
          logger.debug("📞 Gọi onBack callback")
          await onBack()
        }

        // 3. Invalidate React Query cache nếu có queryClient và queryKey
        // Chỉ invalidate, không refetch ngay để tránh duplicate requests
        if (queryClient && invalidateQueryKey) {
          logger.debug("🗑️ Invalidate React Query cache", {
            queryKey: invalidateQueryKey,
          })
          await queryClient.invalidateQueries({ 
            queryKey: invalidateQueryKey, 
            refetchType: "active" // Chỉ refetch queries đang active
          })
        }

        logger.info("➡️ Đang navigate", {
          originalUrl: backUrl,
          resolvedUrl: resolvedBackUrl,
        })

        // 4. Navigate - không cần cache-busting parameter và refresh nếu đã có cache
        router.replace(resolvedBackUrl)
        
        const duration = performance.now() - startTime
        logger.success("✅ Navigation hoàn tất", {
          duration: `${duration.toFixed(2)}ms`,
          targetUrl: resolvedBackUrl,
        })
      } finally {
        // Reset flag sau một delay nhỏ để đảm bảo navigation đã hoàn tất
        setTimeout(() => {
          isNavigating = false
        }, 100)
      }
    },
    [router, resourceSegment, queryClient, invalidateQueryKey],
  )

  return { navigateBack, router }
}

