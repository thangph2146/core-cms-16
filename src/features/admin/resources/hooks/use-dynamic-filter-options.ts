"use client"

import { useCallback, useState } from "react"
import { useFilterOptions } from "./use-filter-options"
import type { ColumnFilterSelectOption } from "@/components/tables"

interface UseDynamicFilterOptionsParams {
  optionsEndpoint: string
  limit?: number
}

/**
 * Hook để fetch filter options với search functionality
 * Sử dụng API route /api/admin/{resource}/options?column={column}
 * 
 * @param optionsEndpoint - Endpoint để lấy options (ví dụ: apiRoutes.categories.options({ column: "name" }))
 * @param limit - Maximum number of options
 */
export function useDynamicFilterOptions({
  optionsEndpoint,
  limit = 50,
}: UseDynamicFilterOptionsParams) {
  const [searchQuery, setSearchQuery] = useState("")
  const { options, isLoading } = useFilterOptions({ optionsEndpoint, searchQuery, limit })

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query)
  }, [])

  return { options, isLoading, onSearchChange: handleSearchChange } as {
    options: ColumnFilterSelectOption[]
    isLoading: boolean
    onSearchChange: (query: string) => void
  }
}

