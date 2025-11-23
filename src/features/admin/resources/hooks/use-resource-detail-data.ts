/**
 * Hook để sử dụng React Query cache cho detail data với fallback về Server Component props
 * Đảm bảo detail page hiển thị dữ liệu mới nhất từ React Query cache sau khi edit
 * Theo chuẩn Next.js 16: fetch từ API khi cần để đảm bảo data luôn fresh
 */

import { useMemo } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import type { QueryKey } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/axios"
import { apiRoutes } from "@/lib/api/routes"
import { logger } from "@/lib/config"

interface UseResourceDetailDataOptions<T> {
  /**
   * Initial data từ Server Component props
   */
  initialData: T
  /**
   * Resource ID
   */
  resourceId: string
  /**
   * Query key function để lấy detail data từ React Query cache
   */
  detailQueryKey: (id: string) => QueryKey
  /**
   * Resource name để logging và xác định API route
   */
  resourceName?: string
  /**
   * API route function để fetch detail data (optional, sẽ tự động detect từ resourceName)
   */
  apiRoute?: (id: string) => string
  /**
   * Có nên fetch từ API ngay khi mount không (default: true để đảm bảo data fresh)
   */
  fetchOnMount?: boolean
}

interface UseResourceDetailDataResult<T> {
  /**
   * Detail data (ưu tiên fetchedData > cachedData > initialData)
   */
  data: T
  /**
   * Đã fetch từ API xong chưa (để biết khi nào có thể log data mới)
   */
  isFetched: boolean
  /**
   * Đang fetch từ API không
   */
  isFetching: boolean
  /**
   * Data có phải từ API fetch không (không phải initialData)
   * Dùng để biết khi nào nên log (chỉ log khi isFromApi = true)
   */
  isFromApi: boolean
  /**
   * Data từ API fetch (nếu có) - dùng để log data mới nhất
   * Chỉ có giá trị khi isFromApi = true
   */
  fetchedData?: T
}

/**
 * Hook để sử dụng React Query cache cho detail data
 * Ưu tiên React Query cache nếu có, fallback về initial data từ Server Component
 * Tự động fetch từ API khi cần để đảm bảo data luôn fresh (theo chuẩn Next.js 16)
 * 
 * @example
 * ```tsx
 * const { data: detailData, isFetched } = useResourceDetailData({
 *   initialData: category,
 *   resourceId: categoryId,
 *   detailQueryKey: queryKeys.adminCategories.detail,
 *   resourceName: "categories",
 * })
 * 
 * // Chỉ log khi đã fetch xong để đảm bảo data mới nhất
 * useEffect(() => {
 *   if (isFetched) {
 *     resourceLogger.detailAction({ ... })
 *   }
 * }, [isFetched, detailData])
 * ```
 */
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

  // Tự động detect API route từ resourceName nếu không được cung cấp
  const resolvedApiRoute = useMemo(() => {
    if (apiRoute) return apiRoute(resourceId)
    
    // Map resourceName sang apiRoutes (hỗ trợ cả kebab-case và camelCase)
    try {
      // Thử với resourceName trực tiếp (có thể là kebab-case như "contact-requests")
      let resourceRoutes = (apiRoutes as unknown as Record<string, { detail?: (id: string) => string }>)[resourceName]
      
      // Nếu không tìm thấy, thử convert kebab-case sang camelCase (contact-requests -> contactRequests)
      if (!resourceRoutes?.detail && resourceName.includes("-")) {
        const camelCaseName = resourceName.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
        resourceRoutes = (apiRoutes as unknown as Record<string, { detail?: (id: string) => string }>)[camelCaseName]
      }
      
      if (resourceRoutes?.detail) {
        return resourceRoutes.detail(resourceId)
      }
    } catch {
      // Ignore type errors
    }
    
    // Fallback: tạo route từ resourceName (apiClient sẽ tự động thêm /api prefix)
    return `/admin/${resourceName}/${resourceId}`
  }, [apiRoute, resourceId, resourceName])

  // Fetch từ API khi cần để đảm bảo data luôn fresh (theo chuẩn Next.js 16)
  // Theo chuẩn Next.js 16: không cache admin data - luôn fetch fresh data từ API
  // staleTime: 0 đảm bảo data luôn được coi là stale và refetch khi cần
  // React Query tự động deduplicate requests với cùng queryKey, không cần lo về duplicate fetches
  const { data: fetchedData, isFetched, isFetching } = useQuery<{ data: T }>({
    queryKey,
    queryFn: async () => {
      // Chỉ log khi thực sự fetch (không log khi sử dụng cache)
      // React Query sẽ tự động deduplicate requests với cùng queryKey
      const response = await apiClient.get<{ data: T }>(resolvedApiRoute)
      return response.data
    },
    enabled: fetchOnMount && !!resourceId, // Chỉ fetch khi fetchOnMount = true và có resourceId
    staleTime: 0, // Luôn coi là stale - đảm bảo luôn fetch fresh data (theo chuẩn Next.js 16: không cache admin data)
    gcTime: 5 * 60 * 1000, // 5 minutes - chỉ giữ cache trong memory để tránh flash of old data, không dùng cho fresh data
    refetchOnMount: fetchOnMount && !!resourceId ? "always" : false, // Luôn refetch khi mount nếu fetchOnMount = true để đảm bảo data fresh (đặc biệt sau khi edit)
    refetchOnWindowFocus: false, // Không refetch khi window focus (tránh unnecessary requests)
    refetchOnReconnect: false, // Không refetch khi reconnect (tránh unnecessary requests)
    initialData: queryClient.getQueryData<{ data: T }>(queryKey) || { data: initialData }, // Sử dụng cache hoặc initialData làm initialData
  })

  // Ưu tiên: fetchedData > cachedData > initialData
  const detailData = useMemo(() => {
    // 1. Ưu tiên data vừa fetch từ API (data mới nhất)
    if (fetchedData?.data) {
      return fetchedData.data
    }

    // 2. Sử dụng React Query cache nếu có (có thể là data từ API trước đó)
    const cachedData = queryClient.getQueryData<{ data: T }>(queryKey)
    if (cachedData?.data) {
      return cachedData.data
    }

    // 3. Fallback về initial data từ Server Component
    return initialData
  }, [fetchedData, queryClient, queryKey, initialData])

  // Xác định isFromApi: chỉ true khi đã fetch từ API xong VÀ có data từ API
  // Đảm bảo chỉ log khi data thực sự từ API, không phải initialData
  const isFromApi = useMemo(() => {
    // Chỉ isFromApi = true khi:
    // 1. Đã fetch xong (isFetched = true)
    // 2. VÀ có fetchedData từ API (fetchedData?.data có)
    // Điều này đảm bảo data thực sự từ API, không phải initialData
    if (isFetched && fetchedData?.data) {
      return true
    }

    // Nếu chưa fetch xong hoặc không có fetchedData, không phải từ API
    return false
  }, [isFetched, fetchedData])

  return {
    data: detailData,
    isFetched: isFetched || !fetchOnMount, // Nếu không fetch thì coi như đã fetch (sử dụng initialData)
    isFetching,
    isFromApi, // Chỉ log khi isFromApi = true để đảm bảo data mới từ API
    fetchedData: fetchedData?.data, // Data từ API để log (chỉ có khi isFromApi = true)
  }
}

