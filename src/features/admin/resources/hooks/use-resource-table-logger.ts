import { useEffect, useRef, useMemo, useCallback } from "react"
import type { QueryClient } from "@tanstack/react-query"
import type { DataTableResult } from "@/components/tables"
import { resourceLogger } from "@/lib/config/resource-logger"
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

export function useResourceTableLogger<T extends object>({
  resourceName,
  initialData,
  initialDataByView,
  currentViewId,
  queryClient,
  buildQueryKey,
  columns,
  getRowData,
  cacheVersion: _cacheVersion,
}: UseResourceTableLoggerOptions<T>) {
  const lastLoggedKeyRef = useRef<string | null>(null)
  const lastViewIdRef = useRef<string | undefined>(undefined)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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

  // Build queryKey từ view hiện tại (không cần initialData)
  const currentQueryKey = useMemo(() => {
    const page = currentInitialData?.page ?? 1
    const limit = currentInitialData?.limit ?? 10
    return buildQueryKey({
      status: currentViewStatus,
      page,
      limit,
      search: undefined,
      filters: undefined,
    })
  }, [currentViewStatus, buildQueryKey, currentInitialData?.page, currentInitialData?.limit])

  const logData = useCallback(
    (dataToLog: DataTableResult<T>, viewId: string, viewStatus: string) => {
      if (!dataToLog) return false

      if (dataToLog.rows.length > 0) {
        if (viewStatus === "deleted") {
          const allDeleted = dataToLog.rows.every((r) => {
            const row = r as Record<string, unknown>
            return row.deletedAt !== null && row.deletedAt !== undefined
          })
          if (!allDeleted) {
            // Data không đúng view, skip log
            return false
          }
        } else if (viewStatus === "active") {
          const allActive = dataToLog.rows.every((r) => {
            const row = r as Record<string, unknown>
            return row.deletedAt === null || row.deletedAt === undefined
          })
          if (!allActive) {
            // Data không đúng view, skip log
            return false
          }
        }
      }

      const rowIds = dataToLog.rows
        .map((r) => {
          const row = r as Record<string, unknown>
          return row.id as string
        })
        .sort()
        .join(",")

      const dataKey = `${viewId || "active"}:${dataToLog.page}:${dataToLog.total}:${rowIds}`

      if (lastLoggedKeyRef.current === dataKey && lastViewIdRef.current === viewId) return false

      lastLoggedKeyRef.current = dataKey
      lastViewIdRef.current = viewId

      resourceLogger.tableAction({
        resource: resourceName,
        action: "load-table",
        view: viewStatus,
        total: dataToLog.total,
        page: dataToLog.page,
      })

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

      return true
    },
    [resourceName, columns, getRowData]
  )

  const isQueryKeyEqual = useCallback((key1: QueryKey, key2: QueryKey): boolean => {
    if (key1 === key2) return true
    if (key1.length !== key2.length) return false
    return key1.every((item, index) => {
      const item2 = key2[index]
      if (typeof item === "object" && typeof item2 === "object" && item !== null && item2 !== null) {
        return JSON.stringify(item) === JSON.stringify(item2)
      }
      return item === item2
    })
  }, [])

  useEffect(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }

    const viewChanged = lastViewIdRef.current !== currentViewId
    const isFirstMount = lastViewIdRef.current === undefined

    const cachedData = queryClient.getQueryData<DataTableResult<T>>(currentQueryKey)
    const dataToLog = cachedData || currentInitialData

    if (dataToLog) {
      // Có data ngay, log luôn
      logData(dataToLog, currentViewId || "active", currentViewStatus)
    } else if (viewChanged || isFirstMount) {
      // View thay đổi hoặc lần đầu mount nhưng chưa có data
      // Retry nhiều lần với interval ngắn hơn để đảm bảo log được data ngay
      let retryCount = 0
      const maxRetries = 20 // Tăng số lần retry
      const retryInterval = 50 // Giảm interval xuống 50ms để nhanh hơn

      const retryLog = () => {
        const retryCachedData = queryClient.getQueryData<DataTableResult<T>>(currentQueryKey)
        if (retryCachedData) {
          const logged = logData(retryCachedData, currentViewId || "active", currentViewStatus)
          if (logged) {
            // Đã log thành công, dừng retry
            retryTimeoutRef.current = null
            return
          }
        }

        if (retryCount < maxRetries) {
          retryCount++
          retryTimeoutRef.current = setTimeout(retryLog, retryInterval)
        } else {
          retryTimeoutRef.current = null
        }
      }

      // Bắt đầu retry ngay lập tức
      retryTimeoutRef.current = setTimeout(retryLog, retryInterval)
    }

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
        retryTimeoutRef.current = null
      }
    }
  }, [currentQueryKey, queryClient, currentInitialData, currentViewId, currentViewStatus, logData])

  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event?.query?.queryKey && (event.type === "updated" || event.type === "added")) {
        if (isQueryKeyEqual(event.query.queryKey, currentQueryKey)) {
          const data = event.query.state.data as DataTableResult<T> | undefined
          if (data && event.query.state.status === "success") {
            logData(data, currentViewId || "active", currentViewStatus)
          }
        }
      }
    })

    return unsubscribe
  }, [currentQueryKey, queryClient, currentViewId, currentViewStatus, logData, isQueryKeyEqual])
}

