import { useCallback } from "react"
import type { QueryClient, QueryKey } from "@tanstack/react-query"
import { useResourceRouter, useResourceSegment } from "@/hooks/use-resource-segment"
import { applyResourceSegmentToPath } from "@/lib/permissions"

export interface UseResourceNavigationOptions {
  queryClient?: QueryClient
  invalidateQueryKey?: QueryKey
}

export interface UseResourceNavigationResult {
  navigateBack: (backUrl: string, onBack?: () => Promise<void> | void) => Promise<void>
  router: ReturnType<typeof useResourceRouter>
}

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
        await queryClient.refetchQueries({ queryKey: invalidateQueryKey, type: "all" })
      }

      // 3. Apply resource segment to backUrl
      const resolvedBackUrl = applyResourceSegmentToPath(backUrl, resourceSegment)

      // 4. Navigate với cache-busting parameter để force Server Component refetch
      const url = new URL(resolvedBackUrl, window.location.origin)
      url.searchParams.set("_t", Date.now().toString())
      router.replace(url.pathname + url.search)
      
      await new Promise((resolve) => setTimeout(resolve, 50))
      router.refresh()
    },
    [router, resourceSegment, queryClient, invalidateQueryKey],
  )

  return { navigateBack, router }
}

