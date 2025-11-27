import type { NotificationRow } from "../types"

export function matchesSearch(search: string | undefined, row: NotificationRow): boolean {
  if (!search) return true
  const term = search.trim().toLowerCase()
  if (!term) return true
  return [
    row.title,
    row.description ?? "",
    row.userEmail ?? "",
    row.userName ?? "",
    row.kind,
  ]
    .some((value) => value.toLowerCase().includes(term))
}

export function matchesFilters(
  filters: Record<string, string> | undefined,
  row: NotificationRow
): boolean {
  if (!filters) return true
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === "") continue
    switch (key) {
      case "isRead": {
        const expected = value === "true"
        if (row.isRead !== expected) return false
        break
      }
      case "kind":
        if (row.kind !== value) return false
        break
      case "userEmail":
        if ((row.userEmail ?? "") !== value) return false
        break
      default:
        break
    }
  }
  return true
}

export function insertRowIntoPage(
  rows: NotificationRow[],
  row: NotificationRow,
  limit: number
): NotificationRow[] {
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
  rows: NotificationRow[],
  id: string
): { rows: NotificationRow[]; removed: boolean } {
  const index = rows.findIndex((item) => item.id === id)
  if (index === -1) return { rows, removed: false }
  const next = [...rows]
  next.splice(index, 1)
  return { rows: next, removed: true }
}

export function convertSocketPayloadToRow(
  payload: {
    id: string
    kind: string
    title: string
    description?: string | null
    read?: boolean
    toUserId: string
    timestamp?: number
  },
  userEmail?: string | null,
  userName?: string | null
): NotificationRow {
  const timestamp = payload.timestamp ?? Date.now()
  return {
    id: payload.id,
    userId: payload.toUserId,
    userEmail: userEmail ?? null,
    userName: userName ?? null,
    kind: payload.kind.toUpperCase(),
    title: payload.title,
    description: payload.description ?? null,
    isRead: payload.read ?? false,
    actionUrl: null,
    createdAt: new Date(timestamp).toISOString(),
    readAt: payload.read ? new Date(timestamp).toISOString() : null,
    expiresAt: null,
  }
}

