/**
 * Generic Helper Functions for Resources
 * 
 * Chứa các helper functions generic được dùng chung bởi các resource features
 * Có thể được extend hoặc customize cho từng resource cụ thể
 */

import type { DataTableResult } from "@/components/tables"

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
 */
export function serializeDate(date: Date | null | undefined): string | null {
  if (!date) return null
  return date.toISOString()
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

