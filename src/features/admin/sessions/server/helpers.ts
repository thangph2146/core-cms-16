import type { Prisma } from "@prisma/client"
import type { DataTableResult } from "@/components/tables"
import {
  applyDateFilter,
  applyStringFilter,
  applyBooleanFilter,
} from "@/features/admin/resources/server"
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

  // Search filter with relations
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

  // Apply custom filters
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
        case "ipAddress":
          applyStringFilter(where, key, value)
          break
        case "isActive":
          applyBooleanFilter(where, key, value)
          break
        case "status":
          // Session không có deletedAt, sử dụng isActive
          if (value === "deleted") where.isActive = false
          else if (value === "active") where.isActive = true
          break
        case "expiresAt":
        case "createdAt":
          applyDateFilter(where, key, value)
          break
      }
    }
  }

  return where
}

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

export function serializeSessionsList(data: ListSessionsResult & { rows: Array<ListedSession & { userName?: string | null; userEmail?: string }> }): DataTableResult<SessionRow> {
  return {
    page: data.page,
    limit: data.limit,
    total: data.total,
    totalPages: data.totalPages,
    rows: data.rows.map(serializeSessionForTable),
  }
}

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

