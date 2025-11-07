/**
 * Helper Functions for Sessions Server Logic
 * 
 * Chứa các helper functions được dùng chung bởi queries, cache, và mutations
 * 
 * Note: Session model không có deletedAt, sử dụng isActive=false để đánh dấu "deleted"
 */

import type { Prisma } from "@prisma/client"
import type { DataTableResult } from "@/components/tables"
import type { ListSessionsInput, ListedSession, SessionDetail, ListSessionsResult } from "../types"
import type { SessionRow } from "../types"

type SessionWithRelations = Prisma.SessionGetPayload<{
  include: {
    user: {
      select: {
        id: true
        name: true
        email: true
      }
    }
  }
}>

/**
 * Map Prisma session record to ListedSession format
 */
export function mapSessionRecord(session: SessionWithRelations): ListedSession {
  return {
    id: session.id,
    userId: session.userId,
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    userAgent: session.userAgent,
    ipAddress: session.ipAddress,
    isActive: session.isActive,
    expiresAt: session.expiresAt.toISOString(),
    lastActivity: session.lastActivity.toISOString(),
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
    // Session model không có deletedAt, sử dụng isActive=false để đánh dấu "deleted"
    deletedAt: null,
  }
}

/**
 * Build Prisma where clause from ListSessionsInput
 * Note: Session không có deletedAt, sử dụng isActive để phân biệt active/deleted
 */
export function buildWhereClause(params: ListSessionsInput): Prisma.SessionWhereInput {
  const where: Prisma.SessionWhereInput = {}
  const status = params.status ?? "active"

  // Session không có deletedAt, sử dụng isActive để phân biệt
  if (status === "active") {
    where.isActive = true
  } else if (status === "deleted") {
    where.isActive = false
  }
  // "all" sẽ không filter theo isActive

  if (params.search) {
    const searchValue = params.search.trim()
    if (searchValue.length > 0) {
      where.OR = [
        { accessToken: { contains: searchValue, mode: "insensitive" } },
        { refreshToken: { contains: searchValue, mode: "insensitive" } },
        { userAgent: { contains: searchValue, mode: "insensitive" } },
        { ipAddress: { contains: searchValue, mode: "insensitive" } },
        { user: { name: { contains: searchValue, mode: "insensitive" } } },
        { user: { email: { contains: searchValue, mode: "insensitive" } } },
      ]
    }
  }

  if (params.filters) {
    const activeFilters = Object.entries(params.filters).filter(([, value]) => Boolean(value))
    for (const [key, rawValue] of activeFilters) {
      const value = typeof rawValue === "string" ? rawValue.trim() : ""
      if (!value) continue

      switch (key) {
        case "userId":
          where.userId = value
          break
        case "userAgent":
          where.userAgent = { contains: value, mode: "insensitive" }
          break
        case "ipAddress":
          where.ipAddress = { contains: value, mode: "insensitive" }
          break
        case "isActive":
          if (value === "true") where.isActive = true
          else if (value === "false") where.isActive = false
          break
        case "status":
          // Session không có deletedAt, sử dụng isActive
          if (value === "deleted") where.isActive = false
          else if (value === "active") where.isActive = true
          break
        case "expiresAt":
        case "createdAt":
          try {
            const filterDate = new Date(value)
            if (!isNaN(filterDate.getTime())) {
              const startOfDay = new Date(filterDate)
              startOfDay.setHours(0, 0, 0, 0)
              const endOfDay = new Date(filterDate)
              endOfDay.setHours(23, 59, 59, 999)
              where[key === "createdAt" ? "createdAt" : "expiresAt"] = {
                gte: startOfDay,
                lte: endOfDay,
              }
            }
          } catch {
            // Invalid date format, skip filter
          }
          break
      }
    }
  }

  return where
}

/**
 * Serialize session data for DataTable format
 */
export function serializeSessionForTable(session: ListedSession & { userName?: string | null; userEmail?: string }): SessionRow {
  return {
    id: session.id,
    userId: session.userId,
    userName: session.userName || null,
    userEmail: session.userEmail || "",
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    userAgent: session.userAgent,
    ipAddress: session.ipAddress,
    isActive: session.isActive,
    expiresAt: session.expiresAt,
    lastActivity: session.lastActivity,
    createdAt: session.createdAt,
    deletedAt: null, // Session không có deletedAt
  }
}

/**
 * Serialize ListSessionsResult to DataTable format
 */
export function serializeSessionsList(data: ListSessionsResult & { rows: Array<ListedSession & { userName?: string | null; userEmail?: string }> }): DataTableResult<SessionRow> {
  return {
    page: data.page,
    limit: data.limit,
    total: data.total,
    totalPages: data.totalPages,
    rows: data.rows.map(serializeSessionForTable),
  }
}

/**
 * Serialize SessionDetail to client format
 */
export function serializeSessionDetail(session: SessionDetail) {
  return {
    id: session.id,
    userId: session.userId,
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    userAgent: session.userAgent,
    ipAddress: session.ipAddress,
    isActive: session.isActive,
    expiresAt: session.expiresAt,
    lastActivity: session.lastActivity,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    deletedAt: null, // Session không có deletedAt
    userName: session.userName,
    userEmail: session.userEmail,
  }
}

export type { SessionWithRelations }

