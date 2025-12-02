"use client"

import { useCallback, useState } from "react"
import { useFilterOptions } from "./use-filter-options"
import type { ColumnFilterSelectOption } from "@/components/tables"

interface UseDynamicFilterOptionsParams {
  optionsEndpoint: string
  limit?: number
}

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

