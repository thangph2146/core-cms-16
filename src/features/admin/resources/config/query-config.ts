/**
 * Admin Query Configuration
 * 
 * Chuẩn hóa cấu hình TanStack Query cho tất cả admin features
 * Theo chuẩn Next.js 16: không cache admin data - luôn fetch fresh data từ API
 * 
 * Tất cả admin features phải sử dụng config này để đảm bảo:
 * - staleTime: 0 (luôn coi là stale, không cache)
 * - refetchOnMount: "always" (luôn refetch khi mount để đảm bảo data fresh)
 * - refetchOnWindowFocus: false (không refetch khi focus để tránh unnecessary requests)
 */

import type { UseQueryOptions, UseMutationOptions } from "@tanstack/react-query"

/**
 * Default query options cho admin features
 * Đảm bảo data luôn fresh, không cache
 */
export const ADMIN_QUERY_DEFAULTS = {
  staleTime: 0 as const, // Luôn coi là stale - đảm bảo luôn fetch fresh data
  gcTime: 5 * 60 * 1000, // 5 minutes - chỉ giữ cache trong memory để tránh flash of old data, không dùng cho fresh data
  refetchOnMount: "always" as const, // Luôn refetch khi mount để đảm bảo data fresh
  refetchOnWindowFocus: false as const, // Không refetch khi window focus (tránh unnecessary requests)
  refetchOnReconnect: false as const, // Không refetch khi reconnect (tránh unnecessary requests)
} satisfies Partial<UseQueryOptions<unknown, Error>>

/**
 * Default mutation options cho admin features
 */
export const ADMIN_MUTATION_DEFAULTS = {
  retry: 1 as const, // Retry 1 lần khi failed
}

/**
 * Helper để tạo query options với admin defaults
 * 
 * @example
 * ```typescript
 * const { data } = useQuery(
 *   createAdminQueryOptions({
 *     queryKey: queryKeys.adminStudents.list(params),
 *     queryFn: () => fetchStudents(params),
 *   })
 * )
 * ```
 */
export function createAdminQueryOptions<TData = unknown, TError = Error>(
  options: Omit<
    UseQueryOptions<TData, TError>,
    "staleTime" | "gcTime" | "refetchOnMount" | "refetchOnWindowFocus" | "refetchOnReconnect"
  >
): UseQueryOptions<TData, TError> {
  return {
    ...ADMIN_QUERY_DEFAULTS,
    ...options,
  } as UseQueryOptions<TData, TError>
}

/**
 * Helper để tạo mutation options với admin defaults
 * 
 * @example
 * ```typescript
 * const mutation = useMutation({
 *   ...createAdminMutationOptions({
 *     mutationFn: (data) => createStudent(data),
 *     onSuccess: () => {
 *       queryClient.invalidateQueries({ queryKey: queryKeys.adminStudents.all() })
 *     },
 *   }),
 * })
 * ```
 */
export function createAdminMutationOptions<TData = unknown, TError = Error, TVariables = void>(
  options: Omit<UseMutationOptions<TData, TError, TVariables>, "retry">
): UseMutationOptions<TData, TError, TVariables> {
  return {
    ...ADMIN_MUTATION_DEFAULTS,
    ...options,
  } as UseMutationOptions<TData, TError, TVariables>
}

/**
 * Query client fetch options cho admin features
 * Sử dụng trong queryClient.fetchQuery()
 * 
 * @example
 * ```typescript
 * const data = await queryClient.fetchQuery(
 *   createAdminFetchOptions({
 *     queryKey: queryKeys.adminStudents.list(params),
 *     queryFn: () => fetchStudents(params),
 *   })
 * )
 * ```
 */
export function createAdminFetchOptions<TData = unknown>(
  options: {
    queryKey: readonly unknown[]
    queryFn: () => Promise<TData>
  }
): {
  queryKey: readonly unknown[]
  queryFn: () => Promise<TData>
  staleTime: number
  gcTime: number
  refetchOnMount: "always"
  refetchOnWindowFocus: false
  refetchOnReconnect: false
} {
  return {
    ...ADMIN_QUERY_DEFAULTS,
    ...options,
  }
}

