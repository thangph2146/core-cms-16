import type { UserRow } from "../types"
import type { AdminUsersListParams } from "@/lib/query-keys"

export function matchesSearch(search: string | undefined, row: UserRow): boolean {
  if (!search || typeof search !== "string") return true
  const term = search.trim().toLowerCase()
  if (!term) return true
  return [row.email, row.name].some((value) => value?.toLowerCase().includes(term) ?? false)
}

export function matchesFilters(
  filters: AdminUsersListParams["filters"],
  row: UserRow
): boolean {
  if (!filters) return true
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined) continue
    switch (key) {
      case "email":
        if (row.email !== value) return false
        break
      case "name":
        if (row.name !== value) return false
        break
      case "isActive":
        if (String(row.isActive) !== value) return false
        break
      default:
        break
    }
  }
  return true
}

export function shouldIncludeInStatus(
  paramsStatus: AdminUsersListParams["status"],
  rowStatus: "active" | "deleted"
): boolean {
  if (paramsStatus === "all") return true
  if (!paramsStatus) return rowStatus === "active"
  return paramsStatus === rowStatus
}

export function insertRowIntoPage(
  rows: UserRow[],
  row: UserRow,
  limit: number
): UserRow[] {
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

export function removeRowFromPage(
  rows: UserRow[],
  id: string
): { rows: UserRow[]; removed: boolean } {
  const index = rows.findIndex((item) => item.id === id)
  if (index === -1) return { rows, removed: false }
  const next = [...rows]
  next.splice(index, 1)
  return { rows: next, removed: true }
}

