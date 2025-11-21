import { useEffect, useRef } from "react"
import type { QueryClient, QueryKey } from "@tanstack/react-query"
import type { DataTableResult } from "@/components/tables"
import { logger } from "@/lib/config"

interface UseResourceInitialDataCacheOptions<T extends object, P> {
  initialData?: DataTableResult<T>
  queryClient: QueryClient
  /**
   * Hàm build params để tạo query key tương ứng với initial data
   */
  buildParams: (initialData: DataTableResult<T>) => P
  /**
   * Hàm tạo query key cho list query (ví dụ queryKeys.adminTags.list)
   */
  buildQueryKey: (params: P) => QueryKey
  /**
   * Resource name để logging (ví dụ "students", "tags")
   */
  resourceName?: string
}

/**
 * Đồng bộ initial data (SSR) vào React Query cache để realtime updates hoạt động ổn định
 * 
 * @example
 * ```tsx
 * useResourceInitialDataCache({
 *   initialData,
 *   queryClient,
 *   buildParams: (data) => ({ page: data.page, limit: data.limit, status: "active" }),
 *   buildQueryKey: (params) => queryKeys.adminTags.list(params),
 *   resourceName: "tags",
 * })
 * ```
 */
export function useResourceInitialDataCache<T extends object, P>({
  initialData,
  queryClient,
  buildParams,
  buildQueryKey,
  resourceName = "resource",
}: UseResourceInitialDataCacheOptions<T, P>) {
  const hasCachedRef = useRef(false)

  useEffect(() => {
    if (!initialData) return

    // Chỉ cache một lần để tránh duplicate logs
    if (hasCachedRef.current) {
      return
    }

    const params = buildParams(initialData)
    const queryKey = buildQueryKey(params)

    queryClient.setQueryData(queryKey, initialData)
    hasCachedRef.current = true

    logger.debug(`[useResourceInitialDataCache:${resourceName}] Set initial data to cache`, {
      queryKey,
      rowsCount: initialData.rows.length,
      total: initialData.total,
    })
  }, [initialData, queryClient, buildParams, buildQueryKey, resourceName])
}
