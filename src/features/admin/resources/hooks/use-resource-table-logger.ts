/**
 * Hook để log table structure khi data thay đổi sau refetch
 * Track data từ React Query cache và log khi data mới được refetch
 */

import { useEffect, useRef, useMemo } from "react"
import type { QueryClient } from "@tanstack/react-query"
import type { DataTableResult } from "@/components/tables"
import { resourceLogger } from "@/lib/config"
import type { QueryKey } from "@tanstack/react-query"

interface UseResourceTableLoggerOptions<T extends object> {
  resourceName: string
  initialData?: DataTableResult<T>
  initialDataByView?: Record<string, DataTableResult<T>>
  currentViewId?: string
  queryClient: QueryClient
  buildQueryKey: (params: { status: "active" | "deleted" | "all"; page: number; limit: number; search?: string; filters?: Record<string, string> }) => QueryKey
  columns: string[]
  getRowData: (row: T) => Record<string, unknown>
  cacheVersion?: number
}

/**
 * Hook để log table structure khi data thay đổi sau refetch
 * Track data từ React Query cache và log khi data mới được refetch
 */
export function useResourceTableLogger<T extends object>({
  resourceName,
  initialData,
  initialDataByView,
  currentViewId,
  queryClient,
  buildQueryKey,
  columns,
  getRowData,
  cacheVersion,
}: UseResourceTableLoggerOptions<T>) {
  const lastLoggedKeyRef = useRef<string | null>(null)
  const lastViewIdRef = useRef<string | undefined>(undefined)

  // Xác định view hiện tại và status tương ứng
  const currentViewStatus = useMemo(() => {
    if (currentViewId === "deleted") return "deleted"
    if (currentViewId === "all") return "all"
    return "active"
  }, [currentViewId])

  // Lấy initialData cho view hiện tại
  const currentInitialData = useMemo(() => {
    if (currentViewId && initialDataByView?.[currentViewId]) {
      return initialDataByView[currentViewId]
    }
    return initialData
  }, [currentViewId, initialDataByView, initialData])

  // Track data từ React Query cache
  const currentQueryKey = useMemo(() => {
    if (!currentInitialData) return null
    return buildQueryKey({
      status: currentViewStatus,
      page: currentInitialData.page,
      limit: currentInitialData.limit,
      search: undefined,
      filters: undefined,
    })
  }, [currentInitialData?.page, currentInitialData?.limit, currentViewStatus, buildQueryKey])

  // Log khi data thay đổi hoặc khi view thay đổi - Tối ưu: tránh duplicate
  useEffect(() => {
    if (!currentQueryKey) return

    const cachedData = queryClient.getQueryData<DataTableResult<T>>(currentQueryKey)
    const dataToLog = cachedData || currentInitialData
    if (!dataToLog) return

    // Kiểm tra xem data có đúng view không (tránh log data của view cũ)
    // Nếu là deleted view, tất cả rows phải có deletedAt !== null
    // Nếu là active view, tất cả rows phải có deletedAt === null
    if (dataToLog.rows.length > 0) {
      if (currentViewStatus === "deleted") {
        const allDeleted = dataToLog.rows.every((r) => {
          const row = r as Record<string, unknown>
          return row.deletedAt !== null && row.deletedAt !== undefined
        })
        if (!allDeleted) {
          // Data không đúng view, skip log
          return
        }
      } else if (currentViewStatus === "active") {
        const allActive = dataToLog.rows.every((r) => {
          const row = r as Record<string, unknown>
          return row.deletedAt === null || row.deletedAt === undefined
        })
        if (!allActive) {
          // Data không đúng view, skip log
          return
        }
      }
    }

    // Tạo unique key: view + page + total + rowIds (chỉ IDs để tránh log quá nhiều)
    const rowIds = dataToLog.rows
      .map((r) => {
        const row = r as Record<string, unknown>
        return row.id as string
      })
      .sort()
      .join(",")

    const dataKey = `${currentViewId || "active"}:${dataToLog.page}:${dataToLog.total}:${rowIds}`

    // Skip nếu data không thay đổi và view không thay đổi
    const viewChanged = lastViewIdRef.current !== currentViewId
    if (!viewChanged && lastLoggedKeyRef.current === dataKey) return

    // Mark as logged
    lastLoggedKeyRef.current = dataKey
    lastViewIdRef.current = currentViewId

    // Log table action
    resourceLogger.tableAction({
      resource: resourceName,
      action: "load-table",
      view: currentViewStatus,
      total: dataToLog.total,
      page: dataToLog.page,
    })

    // Log structure với đầy đủ rows
    const allRows = dataToLog.rows.map((row) => getRowData(row as T))

    resourceLogger.dataStructure({
      resource: resourceName,
      dataType: "table",
      rowCount: dataToLog.rows.length,
      structure: {
        columns,
        pagination: {
          page: dataToLog.page,
          limit: dataToLog.limit,
          total: dataToLog.total,
          totalPages: dataToLog.totalPages,
        },
        sampleRows: allRows,
      },
    })
  }, [currentQueryKey, queryClient, currentInitialData, resourceName, columns, getRowData, currentViewId, currentViewStatus])
}

