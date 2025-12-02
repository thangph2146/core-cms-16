"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/axios"
import type { ColumnFilterSelectOption } from "@/components/tables"

interface UseFilterOptionsParams {
  optionsEndpoint: string
  searchQuery?: string
  limit?: number
}

export function useFilterOptions({
  optionsEndpoint,
  searchQuery = "",
  limit = 50,
}: UseFilterOptionsParams) {
  const debouncedQuery = useDebounce(searchQuery, 300)

  const { data: options = [], isLoading } = useQuery<ColumnFilterSelectOption[]>({
    queryKey: ["filter-options", optionsEndpoint, debouncedQuery, limit],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        ...(debouncedQuery && { search: debouncedQuery }),
      })

      const url = `${optionsEndpoint}${optionsEndpoint.includes("?") ? "&" : "?"}${params}`
      const response = await apiClient.get<{ data: ColumnFilterSelectOption[] }>(url)
      
      return response.data.data || []
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!optionsEndpoint,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  return { options, isLoading }
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value)

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}
