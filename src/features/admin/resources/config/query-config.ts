import type { UseQueryOptions, UseMutationOptions } from "@tanstack/react-query"

export const ADMIN_QUERY_DEFAULTS = {
  staleTime: 0 as const,
  gcTime: 5 * 60 * 1000,
  refetchOnMount: "always" as const,
  refetchOnWindowFocus: false as const,
  refetchOnReconnect: false as const,
} satisfies Partial<UseQueryOptions<unknown, Error>>

export const ADMIN_MUTATION_DEFAULTS = {
  retry: 1 as const,
}

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

export function createAdminMutationOptions<TData = unknown, TError = Error, TVariables = void>(
  options: Omit<UseMutationOptions<TData, TError, TVariables>, "retry">
): UseMutationOptions<TData, TError, TVariables> {
  return {
    ...ADMIN_MUTATION_DEFAULTS,
    ...options,
  } as UseMutationOptions<TData, TError, TVariables>
}

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

