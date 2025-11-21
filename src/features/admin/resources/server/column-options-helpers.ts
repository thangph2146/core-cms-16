/**
 * Helper Functions for Column Options Queries
 * 
 * Chuẩn hóa logic query column options cho filter dropdowns
 * Đảm bảo nhất quán về cách query và filter
 */

/**
 * Options cho column options query
 */
export interface ColumnOptionsQueryOptions {
  /**
   * Status filter: "active" (default), "deleted", hoặc "all"
   * Column options thường chỉ cần active items
   */
  status?: "active" | "deleted" | "all"
  /**
   * Search query string
   */
  search?: string
  /**
   * Limit số lượng results
   */
  limit?: number
}

/**
 * Apply status filter to where clause cho column options
 * Column options thường chỉ cần active items (default)
 */
export function applyColumnOptionsStatusFilter<T extends Record<string, unknown>>(
  where: T,
  status: "active" | "deleted" | "all" = "active"
): void {
  if (status === "active") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(where as any).deletedAt = null
  } else if (status === "deleted") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(where as any).deletedAt = { not: null }
  }
  // "all" means no filter applied
}

/**
 * Apply search filter to where clause cho column options
 */
export function applyColumnOptionsSearchFilter<T extends Record<string, unknown>>(
  where: T,
  search: string | undefined,
  field: keyof T
): void {
  if (!search || !search.trim()) return

  const searchValue = search.trim()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(where as any)[field] = { contains: searchValue, mode: "insensitive" }
}

/**
 * Generic helper để build where clause cho column options
 */
export function buildColumnOptionsWhereClause<T extends Record<string, unknown>>(
  options: ColumnOptionsQueryOptions,
  defaultField: keyof T,
  customFields?: Record<string, keyof T>
): T {
  const where = {} as T

  // Apply status filter (default: active)
  applyColumnOptionsStatusFilter(where, options.status)

  // Apply search filter
  if (options.search && options.search.trim()) {
    const searchValue = options.search.trim()
    const field = customFields?.[searchValue] || defaultField
    applyColumnOptionsSearchFilter(where, options.search, field)
  }

  return where
}

/**
 * Map Prisma results to column options format
 */
export function mapToColumnOptions<T extends Record<string, unknown>>(
  results: T[],
  column: string
): Array<{ label: string; value: string }> {
  return results
    .map((item) => {
      const value = item[column as keyof T]
      if (typeof value === "string" && value.trim()) {
        return {
          label: value,
          value: value,
        }
      }
      return null
    })
    .filter((item): item is { label: string; value: string } => item !== null)
}

