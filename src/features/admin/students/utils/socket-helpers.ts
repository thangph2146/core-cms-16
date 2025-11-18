/**
 * Helper functions cho socket bridge
 * Tách ra để dễ test và tái sử dụng
 */

import type { StudentRow } from "../types"
import type { AdminStudentsListParams } from "@/lib/query-keys"

/**
 * Kiểm tra xem student có match với search term không
 */
export function matchesSearch(search: string | undefined, row: StudentRow): boolean {
  if (!search) return true
  const term = search.trim().toLowerCase()
  if (!term) return true
  return [
    row.studentCode,
    row.name ?? "",
    row.email ?? "",
  ]
    .some((value) => value.toLowerCase().includes(term))
}

/**
 * Kiểm tra xem student có match với filters không
 */
export function matchesFilters(
  filters: AdminStudentsListParams["filters"],
  row: StudentRow
): boolean {
  if (!filters) return true
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined) continue
    switch (key) {
      case "isActive": {
        const expected = value === "true"
        if (row.isActive !== expected) return false
        break
      }
      case "studentCode":
        if (row.studentCode !== value) return false
        break
      case "name":
        if ((row.name ?? "") !== value) return false
        break
      case "email":
        if ((row.email ?? "") !== value) return false
        break
      default:
        break
    }
  }
  return true
}

/**
 * Kiểm tra xem student có nên được include trong status view không
 */
export function shouldIncludeInStatus(
  paramsStatus: AdminStudentsListParams["status"],
  rowStatus: "active" | "deleted"
): boolean {
  if (paramsStatus === "all") return true
  if (!paramsStatus) return rowStatus === "active"
  return paramsStatus === rowStatus
}

/**
 * Insert hoặc update row vào page
 */
export function insertRowIntoPage(
  rows: StudentRow[],
  row: StudentRow,
  limit: number
): StudentRow[] {
  const existingIndex = rows.findIndex((item) => item.id === row.id)
  if (existingIndex >= 0) {
    const next = [...rows]
    next[existingIndex] = row
    return next
  }
  const next = [row, ...rows]
  if (next.length > limit) {
    next.pop()
  }
  return next
}

/**
 * Remove row khỏi page
 */
export function removeRowFromPage(
  rows: StudentRow[],
  id: string
): { rows: StudentRow[]; removed: boolean } {
  const index = rows.findIndex((item) => item.id === id)
  if (index === -1) return { rows, removed: false }
  const next = [...rows]
  next.splice(index, 1)
  return { rows: next, removed: true }
}

