/**
 * Hook chia sẻ để xử lý navigation với backUrl và Breadcrumb
 * Đảm bảo data được load lại đúng khi quay lại list page
 */

import { useCallback } from "react"
import type { QueryClient, QueryKey } from "@tanstack/react-query"
import { useResourceRouter, useResourceSegment } from "@/hooks/use-resource-segment"
import { applyResourceSegmentToPath } from "@/lib/permissions"

export interface UseResourceNavigationOptions {
  /**
   * QueryClient để invalidate cache
   */
  queryClient?: QueryClient
  /**
   * QueryKey để invalidate (optional)
   */
  invalidateQueryKey?: QueryKey
}

export interface UseResourceNavigationResult {
  /**
   * Navigate về backUrl với cache invalidation
   */
  navigateBack: (backUrl: string, onBack?: () => Promise<void> | void) => Promise<void>
  /**
   * Router instance với resource segment support
   */
  router: ReturnType<typeof useResourceRouter>
}

/**
 * Hook để xử lý navigation với backUrl và Breadcrumb
 * Đảm bảo:
 * 1. Invalidate React Query cache trước khi navigate
 * 2. Refresh router để invalidate Router Cache
 * 3. Force Server Component refetch với cache-busting parameter
 */
export function useResourceNavigation({
  queryClient,
  invalidateQueryKey,
}: UseResourceNavigationOptions = {}): UseResourceNavigationResult {
  const router = useResourceRouter()
  const resourceSegment = useResourceSegment()

  const navigateBack = useCallback(
    async (backUrl: string, onBack?: () => Promise<void> | void) => {
      // 1. Gọi custom onBack callback nếu có (để invalidate React Query cache)
      if (onBack) {
        await onBack()
      }

      // 2. Invalidate React Query cache nếu có queryClient và queryKey
      if (queryClient && invalidateQueryKey) {
        await queryClient.invalidateQueries({ queryKey: invalidateQueryKey, refetchType: "all" })
        // Refetch ngay lập tức để đảm bảo data được cập nhật
        await queryClient.refetchQueries({ queryKey: invalidateQueryKey, type: "all" })
      }

      // 3. Apply resource segment to backUrl
      const resolvedBackUrl = applyResourceSegmentToPath(backUrl, resourceSegment)

      // 4. Navigate với cache-busting parameter để force Server Component refetch
      // Sử dụng router.replace thay vì push để tránh thêm entry vào history
      const url = new URL(resolvedBackUrl, window.location.origin)
      url.searchParams.set("_t", Date.now().toString())
      router.replace(url.pathname + url.search)
      
      // 5. Refresh router sau khi navigate để đảm bảo Server Components được re-render
      // Điều này đảm bảo detail page và list page được cập nhật với data mới nhất
      await new Promise((resolve) => setTimeout(resolve, 50))
      router.refresh()
    },
    [router, resourceSegment, queryClient, invalidateQueryKey],
  )

  return { navigateBack, router }
}

