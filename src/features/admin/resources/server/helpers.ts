import type { DataTableResult } from "@/components/tables"
import { logger } from "@/lib/config"
import type { ResourcePagination, ResourceResponse } from "../types"
import { validateCUID } from "@/lib/api/validation"

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

export function serializeResourceForTable<T extends Record<string, unknown>>(
  item: T,
  dateFields: (keyof T)[] = []
): T {
  return serializeDates(item, dateFields) as T
}

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

export function applyRelationFilter<T extends Record<string, unknown>>(
  where: T,
  relationField: string,
  idField: string,
  value: string | undefined,
  relationFilters: Record<string, "contains" | "equals"> = { name: "contains" }
): void {
  if (!value) return

  const trimmedValue = value.trim()
  if (trimmedValue.length === 0) return
  const cuidValidation = validateCUID(trimmedValue)

  if (cuidValidation.valid) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(where as any)[idField] = trimmedValue
  } else {
    const relationConditions: Record<string, unknown> = {}
    for (const [field, operator] of Object.entries(relationFilters)) {
      if (operator === "contains") {
        relationConditions[field] = { contains: trimmedValue, mode: "insensitive" as const }
      } else {
        relationConditions[field] = { equals: trimmedValue, mode: "insensitive" as const }
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(where as any)[relationField] = relationConditions
  }
}

export interface RelationFilterConfig {
  idField: string
  fieldMap: Record<string, string>
  operators?: Record<string, "contains" | "equals">
}

export function applyRelationFilters<T extends Record<string, unknown>>(
  where: T,
  filters: Record<string, string | boolean | undefined> | undefined,
  relationConfigs: Record<string, RelationFilterConfig>
): void {
  if (!filters) return

  for (const [relationField, config] of Object.entries(relationConfigs)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((where as any)[config.idField]) continue

    const relationFilters = Object.entries(config.fieldMap)
      .map(([k, v]) => {
        const val = filters[k]
        return typeof val === "string" && val.trim() ? { field: v, value: val.trim() } : null
      })
      .filter((f): f is { field: string; value: string } => f !== null)

    if (relationFilters.length === 0) continue

    const operators = config.operators || {}
    const idFilter = relationFilters.find((f) => validateCUID(f.value).valid)

    if (idFilter) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(where as any)[config.idField] = idFilter.value
    } else {
      const conditions: Record<string, unknown> = {}
      for (const { field, value } of relationFilters) {
        const op = operators[field] || "contains"
        conditions[field] = op === "contains"
          ? { contains: value, mode: "insensitive" as const }
          : { equals: value, mode: "insensitive" as const }
      }
      if (Object.keys(conditions).length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(where as any)[relationField] = conditions
      }
    }
  }
}

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

