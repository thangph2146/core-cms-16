import type { Role } from "./utils"
import type { ResourceResponse, BaseResourceTableClientProps } from "@/features/admin/resources/types"

export type UserRole = Role

export interface UserRow {
  id: string
  email: string
  name: string | null
  isActive: boolean
  createdAt: string
  deletedAt: string | null
  roles: UserRole[]
}

export interface UsersTableClientProps extends BaseResourceTableClientProps<UserRow> {
  initialRolesOptions?: Array<{ label: string; value: string }>
}

export type UsersResponse = ResourceResponse<UserRow>

