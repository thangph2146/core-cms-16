"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/axios"
import { createAdminQueryOptions } from "../config"
import type { ColumnFilterSelectOption } from "@/components/tables"

interface UseFilterOptionsParams {
  optionsEndpoint: string
  searchQuery?: string
  limit?: number
}

/**
 * Hook để fetch filter options từ API route options
 * Sử dụng TanStack Query để cache và deduplicate requests
 * Sử dụng API route /api/admin/{resource}/options?column={column}&search={search}
 * 
 * @param optionsEndpoint - Endpoint để lấy options (ví dụ: apiRoutes.categories.options({ column: "name" }))
 * @param searchQuery - Search query để filter options
 * @param limit - Maximum number of options
 */
export function useFilterOptions({
  optionsEndpoint,
  searchQuery = "",
  limit = 50,
}: UseFilterOptionsParams) {
  // Debounce search query để tránh quá nhiều requests
  const debouncedQuery = useDebounce(searchQuery, 300)

  // Sử dụng createAdminQueryOptions nhưng override staleTime cho filter options
  // Filter options có thể cache ngắn hạn để tránh quá nhiều requests
  const { data: options = [], isLoading } = useQuery(
    createAdminQueryOptions<ColumnFilterSelectOption[]>({
      queryKey: ["filter-options", optionsEndpoint, debouncedQuery, limit],
      queryFn: async () => {
        const params = new URLSearchParams({
          limit: limit.toString(),
          ...(debouncedQuery && { search: debouncedQuery }),
        })

        // optionsEndpoint đã có column parameter, chỉ cần thêm search và limit
        const url = `${optionsEndpoint}${optionsEndpoint.includes("?") ? "&" : "?"}${params}`
        const response = await apiClient.get<{ data: ColumnFilterSelectOption[] }>(url)
        
        return response.data.data || []
      },
      staleTime: 5 * 60 * 1000, // Override: Cache 5 phút cho filter options
      gcTime: 10 * 60 * 1000, // Override: Keep in cache 10 phút
      enabled: !!optionsEndpoint, // Chỉ fetch khi có endpoint
    })
  )

  return { options, isLoading }
}

/**
 * Simple debounce hook
 */
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value)

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}
