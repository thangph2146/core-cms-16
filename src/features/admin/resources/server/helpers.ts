/**
 * Generic Helper Functions for Resources
 * 
 * Chứa các helper functions generic được dùng chung bởi các resource features
 * Có thể được extend hoặc customize cho từng resource cụ thể
 */

import type { DataTableResult } from "@/components/tables"
import { logger } from "@/lib/config"

/**
 * Generic pagination response structure
 */
export interface ResourcePagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

/**
 * Generic API response structure for resource lists
 */
export interface ResourceResponse<T> {
  data: T[]
  pagination: ResourcePagination
}

/**
 * Serialize date to ISO string
 * Handles Date objects, date strings, and other date-like values
 */
export function serializeDate(date: Date | string | null | undefined): string | null {
  if (!date) return null
  
  try {
    // Convert to Date object if it's a string
    let dateObj: Date
    if (typeof date === "string") {
      dateObj = new Date(date)
    } else if (date instanceof Date) {
      dateObj = date
    } else {
      // Try to convert unknown type to Date
      dateObj = new Date(date as unknown as string | number)
    }

    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      logger.warn("Invalid date encountered in serializeDate", { date, type: typeof date })
      return null
    }
    return dateObj.toISOString()
  } catch (error) {
    logger.error("Error serializing date", { date, error: error as Error })
    return null
  }
}

/**
 * Serialize dates in an object
 */
export function serializeDates<T extends Record<string, unknown>>(
  data: T,
  dateFields: (keyof T)[]
): Record<string, unknown> {
  const serialized: Record<string, unknown> = { ...data }
  for (const field of dateFields) {
    if (field in data && data[field] instanceof Date) {
      serialized[String(field)] = serializeDate(data[field] as Date)
    }
  }
  return serialized
}

/**
 * Build pagination metadata
 */
export function buildPagination(
  page: number,
  limit: number,
  total: number
): ResourcePagination {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  }
}

/**
 * Validate pagination params
 */
export function validatePagination(
  page?: number,
  limit?: number,
  maxLimit = 100
): { page: number; limit: number } {
  return {
    page: Math.max(1, page ?? 1),
    limit: Math.max(1, Math.min(limit ?? 10, maxLimit)),
  }
}

/**
 * Generic serialize function for DataTable
 * Override this in specific resource helpers
 */
export function serializeResourceForTable<T extends Record<string, unknown>>(
  item: T,
  dateFields: (keyof T)[] = []
): T {
  return serializeDates(item, dateFields) as T
}

/**
 * Serialize ResourceResponse to DataTable format
 */
export function serializeResourceList<T extends Record<string, unknown>>(
  data: ResourceResponse<T>,
  dateFields: (keyof T)[] = []
): DataTableResult<T> {
  return {
    page: data.pagination.page,
    limit: data.pagination.limit,
    total: data.pagination.total,
    totalPages: data.pagination.totalPages,
    rows: data.data.map((item) => serializeResourceForTable(item, dateFields)),
  }
}

/**
 * Apply status filter to Prisma where clause (active/deleted/all)
 * Uses deletedAt field for soft delete pattern
 */
export function applyStatusFilter<T extends Record<string, unknown>>(
  where: T,
  status?: "active" | "deleted" | "all"
): void {
  const filterStatus = status ?? "active"
  if (filterStatus === "active") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(where as any).deletedAt = null
  } else if (filterStatus === "deleted") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(where as any).deletedAt = { not: null }
  }
  // "all" means no filter applied
}

/**
 * Apply search filter with OR conditions
 * @param where - Prisma where clause object
 * @param search - Search query string
 * @param fields - Array of field names to search in
 */
export function applySearchFilter<T extends Record<string, unknown>>(
  where: T,
  search: string | undefined,
  fields: Array<keyof T | string>
): void {
  if (!search) return
  
  const searchValue = search.trim()
  if (searchValue.length === 0) return

  const orConditions = fields.map((field) => ({
    [String(field)]: { contains: searchValue, mode: "insensitive" as const },
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(where as any).OR = orConditions
}

/**
 * Apply date filter to Prisma where clause
 * Filters by date range (start of day to end of day)
 */
export function applyDateFilter<T extends Record<string, unknown>>(
  where: T,
  dateField: keyof T,
  dateValue: string | undefined
): void {
  if (!dateValue) return

  try {
    const filterDate = new Date(dateValue)
    if (isNaN(filterDate.getTime())) return

    const startOfDay = new Date(filterDate)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(filterDate)
    endOfDay.setHours(23, 59, 59, 999)

    where[dateField] = {
      gte: startOfDay,
      lte: endOfDay,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma where clause requires dynamic typing
    } as any
  } catch {
    // Invalid date format, skip filter
  }
}

/**
 * Apply boolean filter to Prisma where clause
 */
export function applyBooleanFilter<T extends Record<string, unknown>>(
  where: T,
  field: keyof T,
  value: string | undefined
): void {
  if (!value) return

  const normalizedValue = value.trim().toLowerCase()
  if (normalizedValue === "true" || normalizedValue === "1") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    where[field] = true as any
  } else if (normalizedValue === "false" || normalizedValue === "0") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    where[field] = false as any
  }
}

/**
 * Apply string filter with contains (case-insensitive)
 */
export function applyStringFilter<T extends Record<string, unknown>>(
  where: T,
  field: keyof T,
  value: string | undefined
): void {
  if (!value) return

  const trimmedValue = value.trim()
  if (trimmedValue.length === 0) return

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  where[field] = { contains: trimmedValue, mode: "insensitive" } as any
}

/**
 * Apply status filter from filters object (for backward compatibility)
 */
export function applyStatusFilterFromFilters<T extends Record<string, unknown>>(
  where: T,
  statusValue: string | undefined
): void {
  if (!statusValue) return

  const value = statusValue.trim()
  if (value === "deleted") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(where as any).deletedAt = { not: null }
  } else if (value === "active") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(where as any).deletedAt = null
  }
}

