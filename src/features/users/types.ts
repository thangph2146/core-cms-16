import type { DataTableResult } from "@/components/tables"

export interface UserRole {
  id: string
  name: string
  displayName: string
}

export interface UserRow {
  id: string
  email: string
  name: string | null
  isActive: boolean
  createdAt: string
  deletedAt: string | null
  roles: UserRole[]
}

export interface UsersTableClientProps {
  canDelete?: boolean
  canRestore?: boolean
  canManage?: boolean
  initialData?: DataTableResult<UserRow>
}

export interface UsersResponse {
  data: UserRow[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

