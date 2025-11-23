import { useCallback } from "react"
import type { QueryClient, QueryKey } from "@tanstack/react-query"
import type { DataTableQueryState, DataTableResult } from "@/components/tables"
import type { ResourceTableLoader, ResourceViewMode } from "../types"

interface UseResourceTableLoaderOptions<T extends object, P> {
  queryClient: QueryClient
  fetcher: (params: P) => Promise<DataTableResult<T>>
  buildParams: (input: { query: DataTableQueryState; view: ResourceViewMode<T> }) => P
  buildQueryKey: (params: P) => QueryKey
  staleTime?: number
}

/**
 * Tạo loader chuẩn cho ResourceTable dựa trên fetcher + query client
 * Theo chuẩn Next.js 16: không cache admin data - luôn fetch fresh data từ API
 * Socket updates sẽ update cache trực tiếp, nhưng khi load table sẽ luôn fetch fresh data
 */
export function useResourceTableLoader<T extends object, P>({
  queryClient,
  fetcher,
  buildParams,
  buildQueryKey,
  staleTime = 0, // Luôn coi là stale - đảm bảo luôn fetch fresh data (theo chuẩn Next.js 16: không cache admin data)
}: UseResourceTableLoaderOptions<T, P>): ResourceTableLoader<T> {
  return useCallback<ResourceTableLoader<T>>(
    async (query, view) => {
      const params = buildParams({ query, view })
      const queryKey = buildQueryKey(params)

      // Luôn fetch từ API để đảm bảo data fresh (theo chuẩn Next.js 16)
      // Socket updates sẽ update cache, nhưng khi load table sẽ luôn fetch fresh data
      return queryClient.fetchQuery({
        queryKey,
        staleTime, // staleTime: 0 đảm bảo luôn fetch fresh data
        queryFn: () => fetcher(params),
      })
    },
    [queryClient, fetcher, buildParams, buildQueryKey, staleTime],
  )
}


