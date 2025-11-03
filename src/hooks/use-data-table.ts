/**
 * Hook để quản lý state cho DataTable
 */
import { useState, useEffect, useCallback } from "react"

export interface UseDataTableOptions {
  page?: number
  limit?: number
  defaultLimit?: number
  fetchFn: (params: {
    page: number
    limit: number
    search?: string
    columnFilters?: Record<string, string>
  }) => Promise<{
    data: unknown[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }>
}

export function useDataTable<T = unknown>(options: UseDataTableOptions) {
  const {
    page: initialPage = 1,
    limit: initialLimit,
    defaultLimit = 10,
    fetchFn,
  } = options

  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(initialPage)
  const [limit, setLimit] = useState(initialLimit || defaultLimit)
  const [search, setSearch] = useState("")
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>(
    {}
  )
  const [pagination, setPagination] = useState({
    page: 1,
    limit: defaultLimit,
    total: 0,
    totalPages: 0,
  })

  const fetchData = useCallback(
    async (pageNum: number, limitNum: number, searchValue?: string, filters?: Record<string, string>) => {
      setLoading(true)
      try {
        const result = await fetchFn({
          page: pageNum,
          limit: limitNum,
          search: searchValue ?? search,
          columnFilters: filters ?? columnFilters,
        })
        setData(result.data as T[])
        setPagination(result.pagination)
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    },
    [fetchFn, search, columnFilters]
  )

  useEffect(() => {
    fetchData(page, limit)
  }, [page, limit, fetchData])

  const handlePageChange = useCallback(
    (newPage: number) => {
      setPage(newPage)
    },
    []
  )

  const handleLimitChange = useCallback((newLimit: number) => {
    setLimit(newLimit)
    setPage(1) // Reset to first page when changing limit
  }, [])

  const handleSearchChange = useCallback((newSearch: string) => {
    setSearch(newSearch)
    setPage(1) // Reset to first page when searching
    // Trigger fetch with new search
    fetchData(1, limit, newSearch, columnFilters)
  }, [fetchData, limit, columnFilters])

  const handleColumnFilterChange = useCallback(
    (column: string, value: string) => {
      const newFilters = {
        ...columnFilters,
        [column]: value,
      }
      setColumnFilters(newFilters)
      setPage(1) // Reset to first page when filtering
      // Trigger fetch with new filters
      fetchData(1, limit, search, newFilters)
    },
    [fetchData, limit, search, columnFilters]
  )

  const refresh = useCallback(() => {
    fetchData(page, limit)
  }, [fetchData, page, limit])

  return {
    data,
    loading,
    page,
    limit,
    search,
    columnFilters,
    pagination,
    handlePageChange,
    handleLimitChange,
    handleSearchChange,
    handleColumnFilterChange,
    refresh,
  }
}

