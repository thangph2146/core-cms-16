/**
 * Helper functions cho socket bridge
 * Tách ra để dễ test và tái sử dụng
 */

import type { PostRow } from "../types"
import type { AdminPostsListParams } from "@/lib/query-keys"

/**
 * Kiểm tra xem post có match với search term không
 */
export function matchesSearch(search: string | undefined, row: PostRow): boolean {
  if (!search) return true
  const term = search.trim().toLowerCase()
  if (!term) return true
  return [row.title, row.slug, row.excerpt].some((value) => 
    value?.toLowerCase().includes(term) ?? false
  )
}

/**
 * Kiểm tra xem post có match với filters không
 */
export function matchesFilters(
  filters: AdminPostsListParams["filters"],
  row: PostRow
): boolean {
  if (!filters) return true
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined) continue
    switch (key) {
      case "title":
        if (row.title !== value) return false
        break
      case "slug":
        if (row.slug !== value) return false
        break
      case "published":
        if (String(row.published) !== value) return false
        break
      case "authorId":
        if (row.author.id !== value) return false
        break
      default:
        break
    }
  }
  return true
}

/**
 * Kiểm tra xem post có nên được include trong status view không
 */
export function shouldIncludeInStatus(
  paramsStatus: AdminPostsListParams["status"],
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
  rows: PostRow[],
  row: PostRow,
  limit: number
): PostRow[] {
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
  rows: PostRow[],
  id: string
): { rows: PostRow[]; removed: boolean } {
  const index = rows.findIndex((item) => item.id === id)
  if (index === -1) return { rows, removed: false }
  const next = [...rows]
  next.splice(index, 1)
  return { rows: next, removed: true }
}

