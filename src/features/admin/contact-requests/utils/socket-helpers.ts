/**
 * Helper functions cho socket bridge
 * Tách ra để dễ test và tái sử dụng
 */

import type { ContactRequestRow } from "../types"

/**
 * Kiểm tra xem contact request có match với search term không
 */
export function matchesSearch(search: string | undefined, row: ContactRequestRow): boolean {
  if (!search) return true
  const term = search.trim().toLowerCase()
  if (!term) return true
  return [
    row.name,
    row.email,
    row.phone ?? "",
    row.subject,
    row.assignedToName ?? "",
  ]
    .some((value) => value.toLowerCase().includes(term))
}

/**
 * Kiểm tra xem contact request có match với filters không
 */
export function matchesFilters(
  filters: Record<string, string> | undefined,
  row: ContactRequestRow
): boolean {
  if (!filters) return true
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === "") continue
    switch (key) {
      case "status":
        if (row.status !== value) return false
        break
      case "priority":
        if (row.priority !== value) return false
        break
      case "isRead": {
        const expected = value === "true"
        if (row.isRead !== expected) return false
        break
      }
      case "name":
        if (row.name !== value) return false
        break
      case "email":
        if (row.email !== value) return false
        break
      case "phone":
        if ((row.phone ?? "") !== value) return false
        break
      case "subject":
        if (row.subject !== value) return false
        break
      default:
        break
    }
  }
  return true
}

/**
 * Kiểm tra xem contact request có nên được include trong status view không
 */
export function shouldIncludeInStatus(
  paramsStatus: "active" | "deleted" | "all" | undefined,
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
  rows: ContactRequestRow[],
  row: ContactRequestRow,
  limit: number
): ContactRequestRow[] {
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
  rows: ContactRequestRow[],
  id: string
): { rows: ContactRequestRow[]; removed: boolean } {
  const index = rows.findIndex((item) => item.id === id)
  if (index === -1) return { rows, removed: false }
  const next = [...rows]
  next.splice(index, 1)
  return { rows: next, removed: true }
}

/**
 * Convert socket contact request payload to ContactRequestRow
 */
export function convertSocketPayloadToRow(
  payload: {
    id: string
    name: string
    email: string
    phone?: string | null
    subject: string
    status: string
    priority: string
    createdAt: string
    assignedToId?: string | null
  },
  assignedToName?: string | null
): ContactRequestRow {
  return {
    id: payload.id,
    name: payload.name,
    email: payload.email,
    phone: payload.phone ?? null,
    subject: payload.subject,
    status: payload.status as ContactRequestRow["status"],
    priority: payload.priority as ContactRequestRow["priority"],
    isRead: false, // Default, sẽ được update từ server
    assignedToName: assignedToName ?? null,
    createdAt: payload.createdAt,
    updatedAt: payload.createdAt,
    deletedAt: null,
  }
}

