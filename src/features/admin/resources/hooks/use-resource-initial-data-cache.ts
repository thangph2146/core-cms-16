import { useEffect, useRef } from "react"
import type { QueryClient, QueryKey } from "@tanstack/react-query"
import type { DataTableResult } from "@/components/tables"
import { logger } from "@/lib/config"

interface UseResourceInitialDataCacheOptions<T extends object, P> {
  initialData?: DataTableResult<T>
  queryClient: QueryClient
  /**
   * Hàm build params để tạo query key tương ứng với initial data
   */
  buildParams: (initialData: DataTableResult<T>) => P
  /**
   * Hàm tạo query key cho list query (ví dụ queryKeys.adminTags.list)
   */
  buildQueryKey: (params: P) => QueryKey
  /**
   * Resource name để logging (ví dụ "students", "tags")
   */
  resourceName?: string
}

/**
 * Đồng bộ initial data (SSR) vào React Query cache để realtime updates hoạt động ổn định
 * 
 * @example
 * ```tsx
 * useResourceInitialDataCache({
 *   initialData,
 *   queryClient,
 *   buildParams: (data) => ({ page: data.page, limit: data.limit, status: "active" }),
 *   buildQueryKey: (params) => queryKeys.adminTags.list(params),
 *   resourceName: "tags",
 * })
 * ```
 */
export function useResourceInitialDataCache<T extends object, P>({
  initialData,
  queryClient,
  buildParams,
  buildQueryKey,
  resourceName = "resource",
}: UseResourceInitialDataCacheOptions<T, P>) {
  const hasCachedRef = useRef(false)
  const loggedKeysRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!initialData) return

    const params = buildParams(initialData)
    const queryKey = buildQueryKey(params)
    const cacheKey = JSON.stringify(queryKey)

    // Chỉ cache một lần cho mỗi query key để tránh duplicate logs (React Strict Mode)
    if (loggedKeysRef.current.has(cacheKey)) {
      return
    }

    // Kiểm tra xem cache đã có dữ liệu chưa (từ socket event hoặc từ updateResourceCacheAfterEdit)
    const existingCache = queryClient.getQueryData<DataTableResult<T>>(queryKey)
    
    if (existingCache && existingCache.rows.length > 0) {
      // QUAN TRỌNG: Ưu tiên cache hiện tại nếu nó có nhiều rows hơn initialData
      // Điều này đảm bảo rằng cache từ socket updates hoặc optimistic updates không bị ghi đè
      // bởi initialData từ SSR (có thể stale hoặc không đầy đủ)
      if (existingCache.rows.length > initialData.rows.length) {
        logger.debug(`[useResourceInitialDataCache:${resourceName}] Cache has more rows, keeping cache`, {
          queryKey,
          existingRowsCount: existingCache.rows.length,
          initialRowsCount: initialData.rows.length,
          existingTotal: existingCache.total,
          initialTotal: initialData.total,
        })
        loggedKeysRef.current.add(cacheKey)
        return
      }
      
      // So sánh tất cả rows để tìm rows có updatedAt hoặc có dữ liệu khác
      // Đảm bảo so sánh đúng với row được edit, không chỉ row đầu tiên
      const importantFields = ['name', 'title', 'slug', 'email'] // Các field quan trọng để so sánh
      let hasCacheWithUpdatedAt = false
      let hasDataDifference = false
      let rowsToMerge: Array<{ id: string; mergedRow: Record<string, unknown> }> = []
      let rowsWithUpdatedAt: Array<{ id: string; updatedAt: string }> = []
      
      // So sánh từng row trong cache với initialData
      for (const existingRow of existingCache.rows) {
        const rowId = (existingRow as Record<string, unknown>).id as string | undefined
        if (!rowId) continue
        
        const initialRow = initialData.rows.find((r) => (r as Record<string, unknown>).id === rowId) as Record<string, unknown> | undefined
        if (!initialRow) continue
        
        const existingUpdatedAt = (existingRow as Record<string, unknown>).updatedAt as string | undefined
        const initialUpdatedAt = (initialRow as Record<string, unknown>).updatedAt as string | undefined
        
        // Nếu cache có updatedAt, đánh dấu để giữ cache
        if (existingUpdatedAt) {
          hasCacheWithUpdatedAt = true
          rowsWithUpdatedAt.push({ id: rowId, updatedAt: existingUpdatedAt })
          
          // Nếu cả hai đều có updatedAt, so sánh timestamp
          if (initialUpdatedAt) {
            const existingTime = new Date(existingUpdatedAt).getTime()
            const initialTime = new Date(initialUpdatedAt).getTime()
            
            // Nếu cache mới hơn hoặc bằng, giữ cache cho row này
            if (existingTime >= initialTime) {
              continue // Giữ cache cho row này
            } else {
              // InitialData mới hơn, sẽ merge sau
              hasDataDifference = true
            }
          } else {
            // Cache có updatedAt nhưng initialData không có, so sánh dữ liệu
            const rowHasDifference = importantFields.some(field => {
              const existingValue = (existingRow as Record<string, unknown>)[field]
              const initialValue = initialRow[field]
              return existingValue !== undefined && initialValue !== undefined && existingValue !== initialValue
            })
            
            if (rowHasDifference) {
              // InitialData có dữ liệu khác, merge: giữ updatedAt từ cache nhưng update data từ initialData
              rowsToMerge.push({
                id: rowId,
                mergedRow: { ...initialRow, updatedAt: existingUpdatedAt },
              })
              hasDataDifference = true
            }
            // Nếu không có khác biệt, giữ cache (cache đã được update bởi edit operation)
          }
        } else if (!initialUpdatedAt) {
          // Cả hai đều không có updatedAt, so sánh số lượng fields
          const existingKeys = Object.keys(existingRow as Record<string, unknown>)
          const initialKeys = Object.keys(initialRow)
          
          // Nếu cache có ít fields hơn, có thể cần update từ initialData
          if (existingKeys.length < initialKeys.length) {
            hasDataDifference = true
          }
        }
      }
      
      // Nếu có rows cần merge, merge chúng
      if (rowsToMerge.length > 0) {
        const mergedRows = existingCache.rows.map(r => {
          const rowId = (r as Record<string, unknown>).id as string
          const mergeInfo = rowsToMerge.find(m => m.id === rowId)
          return mergeInfo ? mergeInfo.mergedRow : r
        })
        const mergedCache = {
          ...existingCache,
          rows: mergedRows,
        }
        queryClient.setQueryData(queryKey, mergedCache)
        logger.debug(`[useResourceInitialDataCache:${resourceName}] Merged cache with initialData (cache has updatedAt, initialData has newer data)`, {
          queryKey,
          existingRowsCount: existingCache.rows.length,
          initialRowsCount: initialData.rows.length,
          mergedRowsCount: rowsToMerge.length,
          mergedRows: rowsToMerge.map(m => ({ id: m.id, fields: Object.keys(m.mergedRow) })),
        })
        loggedKeysRef.current.add(cacheKey)
        return
      }
      
      // Nếu cache có updatedAt cho bất kỳ row nào, giữ cache
      if (hasCacheWithUpdatedAt && !hasDataDifference) {
        logger.debug(`[useResourceInitialDataCache:${resourceName}] Cache has updatedAt but initialData doesn't, keeping cache`, {
          queryKey,
          existingRowsCount: existingCache.rows.length,
          initialRowsCount: initialData.rows.length,
          rowsWithUpdatedAt: rowsWithUpdatedAt.map(r => ({ id: r.id, updatedAt: r.updatedAt })),
        })
        loggedKeysRef.current.add(cacheKey)
        return
      }
      
      // Nếu cả hai đều không có updatedAt, so sánh dữ liệu tổng thể
      if (!hasCacheWithUpdatedAt) {
        const existingFirstRow = existingCache.rows[0] as Record<string, unknown>
        const initialFirstRow = initialData.rows[0] as Record<string, unknown>
        const existingKeys = Object.keys(existingFirstRow || {})
        const initialKeys = Object.keys(initialFirstRow || {})
        
        if (existingKeys.length >= initialKeys.length) {
          // Cache có đầy đủ hoặc nhiều fields hơn, giữ cache
          logger.debug(`[useResourceInitialDataCache:${resourceName}] Cache has more or equal fields, keeping cache`, {
            queryKey,
            existingRowsCount: existingCache.rows.length,
            initialRowsCount: initialData.rows.length,
            existingTotal: existingCache.total,
            initialTotal: initialData.total,
            existingKeys: existingKeys.length,
            initialKeys: initialKeys.length,
          })
          loggedKeysRef.current.add(cacheKey)
          return
        }
      }
      
      // Nếu initialData mới hơn, log và ghi đè cache
      logger.debug(`[useResourceInitialDataCache:${resourceName}] Initial data is newer, updating cache`, {
        queryKey,
        existingRowsCount: existingCache.rows.length,
        initialRowsCount: initialData.rows.length,
      })
    }

    // Chỉ set cache nếu chưa có dữ liệu
    queryClient.setQueryData(queryKey, initialData)
    loggedKeysRef.current.add(cacheKey)

    logger.debug(`[useResourceInitialDataCache:${resourceName}] Set initial data to cache`, {
      queryKey,
      rowsCount: initialData.rows.length,
      total: initialData.total,
    })

    // Cleanup sau một khoảng thời gian để cho phép log lại khi navigate
    return () => {
      setTimeout(() => {
        loggedKeysRef.current.delete(cacheKey)
      }, 2000)
    }
  }, [initialData, queryClient, buildParams, buildQueryKey, resourceName])
}
