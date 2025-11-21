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
 */
export function useResourceTableLoader<T extends object, P>({
  queryClient,
  fetcher,
  buildParams,
  buildQueryKey,
  staleTime = 0, // Set staleTime = 0 để data luôn được coi là stale và có thể refetch
}: UseResourceTableLoaderOptions<T, P>): ResourceTableLoader<T> {
  return useCallback<ResourceTableLoader<T>>(
    async (query, view) => {
      const params = buildParams({ query, view })
      const queryKey = buildQueryKey(params)

      return queryClient.fetchQuery({
        queryKey,
        staleTime,
        queryFn: () => fetcher(params),
      })
    },
    [queryClient, fetcher, buildParams, buildQueryKey, staleTime],
  )
}


