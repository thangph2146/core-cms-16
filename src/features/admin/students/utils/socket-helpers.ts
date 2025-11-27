import { resourceLogger } from "@/lib/config"
import type { StudentRow } from "../types"
import type { AdminStudentsListParams } from "@/lib/query-keys"

const SEARCHABLE_FIELDS: Array<keyof StudentRow> = ["studentCode", "name", "email"]

export function matchesSearch(search: string | undefined, row: StudentRow): boolean {
  if (!search?.trim()) return true
  
  const term = search.trim().toLowerCase()
  return SEARCHABLE_FIELDS.some((field) => {
    const value = row[field]
    return typeof value === "string" ? value.toLowerCase().includes(term) : false
  })
}

const FILTER_MATCHERS = {
  isActive: (row: StudentRow, value: string) => row.isActive === (value === "true"),
  studentCode: (row: StudentRow, value: string) => row.studentCode === value,
  name: (row: StudentRow, value: string) => (row.name ?? "") === value,
  email: (row: StudentRow, value: string) => (row.email ?? "") === value,
} as const

type FilterKey = keyof typeof FILTER_MATCHERS

export function matchesFilters(
  filters: AdminStudentsListParams["filters"],
  row: StudentRow
): boolean {
  if (!filters) return true

  return Object.entries(filters).every(([key, value]) => {
    if (value === undefined) return true
    
    const matcher = FILTER_MATCHERS[key as FilterKey]
    if (!matcher) {
      resourceLogger.socket({
        resource: "students",
        action: "socket-update",
        event: "unknown-filter-key",
        payload: { key, availableKeys: Object.keys(FILTER_MATCHERS) },
      })
      return true
    }
    
    return matcher(row, value)
  })
}

export function shouldIncludeInStatus(
  paramsStatus: AdminStudentsListParams["status"],
  rowStatus: "active" | "deleted"
): boolean {
  if (paramsStatus === "all") return true
  return (paramsStatus ?? "active") === rowStatus
}

export function insertRowIntoPage(
  rows: StudentRow[],
  row: StudentRow,
  limit: number
): StudentRow[] {
  const existingIndex = rows.findIndex((item) => item.id === row.id)
  
  if (existingIndex >= 0) {
    // Update existing row
    const next = [...rows]
    next[existingIndex] = row
    resourceLogger.socket({
      resource: "students",
      action: "socket-update",
      event: "update-row-in-page",
      payload: {
        action: "update",
        studentId: row.id,
        studentCode: row.studentCode,
        index: existingIndex,
        beforeLength: rows.length,
        afterLength: next.length,
      },
    })
    return next
  }
  
  // Insert new row at the beginning
  const next = [row, ...rows]
  const result = next.length > limit ? next.slice(0, limit) : next
  resourceLogger.socket({
    resource: "students",
    action: "socket-update",
    event: "insert-row-in-page",
    payload: {
      action: "insert",
      studentId: row.id,
      studentCode: row.studentCode,
      beforeLength: rows.length,
      afterLength: result.length,
      wasTruncated: next.length > limit,
    },
  })
  return result
}

export function removeRowFromPage(
  rows: StudentRow[],
  id: string
): { rows: StudentRow[]; removed: boolean } {
  const index = rows.findIndex((item) => item.id === id)
  
  if (index === -1) {
    resourceLogger.socket({
      resource: "students",
      action: "socket-update",
      event: "row-not-found-for-removal",
      payload: {
        action: "remove",
        studentId: id,
        currentRowsCount: rows.length,
      },
    })
    return { rows, removed: false }
  }
  
  const next = [...rows]
  const removedRow = next[index]
  next.splice(index, 1)
  resourceLogger.socket({
    resource: "students",
    action: "socket-update",
    event: "remove-row-from-page",
    payload: {
      action: "remove",
      studentId: id,
      studentCode: removedRow?.studentCode,
      index,
      beforeLength: rows.length,
      afterLength: next.length,
    },
  })
  return { rows: next, removed: true }
}
