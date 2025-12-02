import type { ResourceResponse, BaseResourceTableClientProps } from "@/features/admin/resources/types"

export interface SessionRow {
  id: string
  userId: string
  userName: string | null
  userEmail: string
  accessToken: string
  refreshToken: string
  userAgent: string | null
  ipAddress: string | null
  isActive: boolean
  expiresAt: string
  lastActivity: string
  createdAt: string
  deletedAt: string | null // Sẽ là null vì model không có deletedAt, nhưng giữ để tương thích với ResourceRow
}

export interface SessionsTableClientProps extends BaseResourceTableClientProps<SessionRow> {
  initialUsersOptions?: Array<{ label: string; value: string }>
}

export type SessionsResponse = ResourceResponse<SessionRow>

export interface ListSessionsInput {
  page?: number
  limit?: number
  search?: string
  filters?: Record<string, string>
  status?: "active" | "deleted" | "all"
}

export interface ListedSession {
  id: string
  userId: string
  accessToken: string
  refreshToken: string
  userAgent: string | null
  ipAddress: string | null
  isActive: boolean
  expiresAt: string
  lastActivity: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null // Sẽ là null vì model không có deletedAt
  userName?: string | null
  userEmail?: string
}

export interface SessionDetail {
  id: string
  userId: string
  accessToken: string
  refreshToken: string
  userAgent: string | null
  ipAddress: string | null
  isActive: boolean
  expiresAt: string
  lastActivity: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  userName: string | null
  userEmail: string
}

export interface ListSessionsResult {
  rows: ListedSession[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface BulkActionResult {
  success: boolean
  message: string
  affectedCount?: number
}

// Types are now exported from schemas.ts
export type { CreateSessionInput, UpdateSessionInput, BulkSessionActionInput } from "./server/schemas"

