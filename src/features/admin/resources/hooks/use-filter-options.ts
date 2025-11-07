"use client"

import { useEffect, useMemo, useState } from "react"
import { apiClient } from "@/lib/api/axios"
import type { ColumnFilterSelectOption } from "@/components/tables"

interface UseFilterOptionsParams {
  optionsEndpoint: string
  searchQuery?: string
  limit?: number
}

/**
 * Hook để fetch filter options từ API route options
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
  const [options, setOptions] = useState<ColumnFilterSelectOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    let cancelled = false

    const fetchOptions = async () => {
      setIsLoading(true)
      try {
        const params = new URLSearchParams({
          limit: limit.toString(),
          ...(debouncedQuery && { search: debouncedQuery }),
        })

        // optionsEndpoint đã có column parameter, chỉ cần thêm search và limit
        const url = `${optionsEndpoint}${optionsEndpoint.includes("?") ? "&" : "?"}${params}`
        const response = await apiClient.get<{ data: ColumnFilterSelectOption[] }>(url)
        
        if (cancelled) return

        setOptions(response.data.data || [])
      } catch (error) {
        if (!cancelled) {
          console.error(`Error fetching filter options:`, error)
          setOptions([])
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchOptions()
    return () => {
      cancelled = true
    }
  }, [optionsEndpoint, debouncedQuery, limit])

  return useMemo(() => ({ options, isLoading }), [options, isLoading])
}

