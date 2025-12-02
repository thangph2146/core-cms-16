import { useCallback } from "react"
import type { QueryClient, QueryKey } from "@tanstack/react-query"
import type { DataTableQueryState, DataTableResult } from "@/components/tables"
import type { ResourceTableLoader, ResourceViewMode } from "../types"
import { createAdminFetchOptions } from "../config"

interface UseResourceTableLoaderOptions<T extends object, P> {
  queryClient: QueryClient
  fetcher: (params: P) => Promise<DataTableResult<T>>
  buildParams: (input: { query: DataTableQueryState; view: ResourceViewMode<T> }) => P
  buildQueryKey: (params: P) => QueryKey
}

export function useResourceTableLoader<T extends object, P>({
  queryClient,
  fetcher,
  buildParams,
  buildQueryKey,
}: UseResourceTableLoaderOptions<T, P>): ResourceTableLoader<T> {
  return useCallback<ResourceTableLoader<T>>(
    async (query, view) => {
      const params = buildParams({ query, view })
      const queryKey = buildQueryKey(params)

      // Socket updates sẽ update cache, nhưng khi load table sẽ luôn fetch fresh data
      return queryClient.fetchQuery<DataTableResult<T>>(
        createAdminFetchOptions<DataTableResult<T>>({
          queryKey,
          queryFn: () => fetcher(params),
        })
      )
    },
    [queryClient, fetcher, buildParams, buildQueryKey],
  )
}


