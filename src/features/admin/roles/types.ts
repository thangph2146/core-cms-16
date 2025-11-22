import type { ResourceResponse, BaseResourceTableClientProps } from "@/features/admin/resources/types"

export interface RoleRow {
  id: string
  name: string
  displayName: string
  description: string | null
  permissions: string[]
  isActive: boolean
  createdAt: string
  updatedAt?: string // Optional để hỗ trợ cache comparison
  deletedAt: string | null
}

export interface RolesTableClientProps extends BaseResourceTableClientProps<RoleRow> {
  initialPermissionsOptions?: Array<{ label: string; value: string }>
}

export type RolesResponse = ResourceResponse<RoleRow>

// Types are now exported from schemas.ts
export type { CreateRoleInput, UpdateRoleInput, BulkRoleActionInput } from "./server/schemas"

