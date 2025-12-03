import { useMemo } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import type { QueryKey } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/axios"
import { apiRoutes } from "@/lib/api/routes"
import { createAdminQueryOptions } from "../config"

interface UseResourceDetailDataOptions<T> {
  initialData: T
  resourceId: string
  detailQueryKey: (id: string) => QueryKey
  resourceName?: string
  apiRoute?: (id: string) => string
  fetchOnMount?: boolean
}

interface UseResourceDetailDataResult<T> {
  data: T
  isFetched: boolean
  isFetching: boolean
  isFromApi: boolean
  fetchedData?: T
}

export function useResourceDetailData<T extends Record<string, unknown>>({
  initialData,
  resourceId,
  detailQueryKey,
  resourceName = "resource",
  apiRoute,
  fetchOnMount = true,
}: UseResourceDetailDataOptions<T>): UseResourceDetailDataResult<T> {
  const queryClient = useQueryClient()
  const queryKey = detailQueryKey(resourceId)

  const resolvedApiRoute = useMemo(() => {
    if (apiRoute) return apiRoute(resourceId)
    try {
      let resourceRoutes = (apiRoutes as unknown as Record<string, { detail?: (id: string) => string }>)[resourceName]
      if (!resourceRoutes?.detail && resourceName.includes("-")) {
        const camelCaseName = resourceName.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
        resourceRoutes = (apiRoutes as unknown as Record<string, { detail?: (id: string) => string }>)[camelCaseName]
      }
      if (resourceRoutes?.detail) return resourceRoutes.detail(resourceId)
    } catch {
      // Ignore type errors
    }
    return `/admin/${resourceName}/${resourceId}`
  }, [apiRoute, resourceId, resourceName])

  // Check if we have fresh cached data
  const cachedData = queryClient.getQueryData<{ data: T }>(queryKey)
  const hasFreshCache = !!cachedData?.data

  const baseQueryOptions = createAdminQueryOptions<{ data: T }>({
    queryKey,
    queryFn: async () => {
      const response = await apiClient.get<{ data: T }>(resolvedApiRoute)
      return response.data
    },
    enabled: fetchOnMount && !!resourceId,
    initialData: cachedData || { data: initialData },
  })

  // Override với staleTime và refetchOnMount tối ưu
  const queryOptions = {
    ...baseQueryOptions,
    // Tăng staleTime để cache lâu hơn và giảm refetch không cần thiết
    staleTime: 30 * 1000, // 30 giây
    // Chỉ refetch nếu data đã stale hoặc chưa có cache
    refetchOnMount: hasFreshCache ? false : "always",
  } as typeof baseQueryOptions
  
  const { data: fetchedData, isFetched, isFetching } = useQuery({ ...queryOptions })

  const detailData = useMemo(() => {
    if (fetchedData?.data) return fetchedData.data
    const cachedData = queryClient.getQueryData<{ data: T }>(queryKey)
    if (cachedData?.data) return cachedData.data
    return initialData
  }, [fetchedData, queryClient, queryKey, initialData])

  const isFromApi = useMemo(() => {
    return isFetched && !!fetchedData?.data
  }, [isFetched, fetchedData])

  return {
    data: detailData,
    isFetched: isFetched || !fetchOnMount,
    isFetching,
    isFromApi,
    fetchedData: fetchedData?.data,
  }
}

