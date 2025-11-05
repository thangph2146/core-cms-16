import type { DataTableResult } from "@/components/tables"

import { listUsersCached, getRolesCached } from "@/features/admin/users/server/queries"
import type { UserRow } from "../types"
import { UsersTableClient } from "./users-table.client"

export interface UsersTableProps {
  canDelete?: boolean
  canRestore?: boolean
  canManage?: boolean
  canCreate?: boolean
}

/**
 * Serializes user data from server query result to DataTable format
 * @param data - Server query result
 * @returns Serialized data for DataTable component
 */
function serializeInitialData(
  data: Awaited<ReturnType<typeof listUsersCached>>,
): DataTableResult<UserRow> {
  return {
    page: data.pagination.page,
    limit: data.pagination.limit,
    total: data.pagination.total,
    totalPages: data.pagination.totalPages,
    rows: data.data.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
      deletedAt: user.deletedAt ? user.deletedAt.toISOString() : null,
      roles: user.roles.map((role) => ({
        id: role.id,
        name: role.name,
        displayName: role.displayName,
      })),
    })),
  }
}

/**
 * Server Component: Users Table
 * Fetches initial user data and roles, then passes them to the client component
 */
export async function UsersTable({ canDelete, canRestore, canManage, canCreate }: UsersTableProps) {
  const initial = await listUsersCached(1, 10, "", "", "active")
  const initialData = serializeInitialData(initial)
  
  // Fetch roles for filter options
  const roles = await getRolesCached()
  const rolesOptions = roles.map((role) => ({
    label: role.displayName,
    value: role.name,
  }))

  return (
    <UsersTableClient
      canDelete={canDelete}
      canRestore={canRestore}
      canManage={canManage}
      canCreate={canCreate}
      initialData={initialData}
      initialRolesOptions={rolesOptions}
    />
  )
}

