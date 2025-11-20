import { useEffect } from "react"
import type { QueryClient, QueryKey } from "@tanstack/react-query"
import type { DataTableResult } from "@/components/tables"

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
   * Optional logger (ví dụ logger.debug)
   */
  logDebug?: (message: string, meta?: Record<string, unknown>) => void
}

/**
 * Đồng bộ initial data (SSR) vào React Query cache để realtime updates hoạt động ổn định
 */
export function useResourceInitialDataCache<T extends object, P>({
  initialData,
  queryClient,
  buildParams,
  buildQueryKey,
  logDebug,
}: UseResourceInitialDataCacheOptions<T, P>) {
  useEffect(() => {
    if (!initialData) return

    const params = buildParams(initialData)
    const queryKey = buildQueryKey(params)

    queryClient.setQueryData(queryKey, initialData)

    logDebug?.("Set initial data to cache", {
      queryKey,
      rowsCount: initialData.rows.length,
      total: initialData.total,
    })
  }, [initialData, queryClient, buildParams, buildQueryKey, logDebug])
}


