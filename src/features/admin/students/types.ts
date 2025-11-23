import type { ResourceResponse, BaseResourceTableClientProps } from "@/features/admin/resources/types"

export interface StudentRow {
  id: string
  userId: string | null
  name: string | null
  email: string | null
  studentCode: string
  isActive: boolean
  createdAt: string
  deletedAt: string | null
}

export type StudentsTableClientProps = BaseResourceTableClientProps<StudentRow>

export type StudentsResponse = ResourceResponse<StudentRow>

export interface ListStudentsInput {
  page?: number
  limit?: number
  search?: string
  filters?: Record<string, string>
  status?: "active" | "deleted" | "all"
  actorId?: string
  isSuperAdmin?: boolean
}

export interface ListedStudent {
  id: string
  userId: string | null
  name: string | null
  email: string | null
  studentCode: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface StudentDetail {
  id: string
  userId: string | null
  name: string | null
  email: string | null
  studentCode: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  userName: string | null
  userEmail: string | null
}

export interface ListStudentsResult {
  rows: ListedStudent[]
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
export type { CreateStudentInput, UpdateStudentInput, BulkStudentActionInput } from "./server/schemas"

