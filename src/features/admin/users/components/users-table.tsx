/**
 * Server Component: Users Table
 * 
 * Fetches initial data và roles, sau đó pass xuống client component
 * Pattern: Server Component (data fetching) → Client Component (UI/interactions)
 */

import { listUsersCached, getRolesCached } from "../server/cache"
import { serializeUsersList } from "../server/helpers"
import { UsersTableClient } from "./users-table.client"

export interface UsersTableProps {
  canDelete?: boolean
  canRestore?: boolean
  canManage?: boolean
  canCreate?: boolean
}

export async function UsersTable({ canDelete, canRestore, canManage, canCreate }: UsersTableProps) {
  const [usersData, roles] = await Promise.all([
    listUsersCached(1, 10, "", "", "active"),
    getRolesCached(),
  ])

  return (
    <UsersTableClient
      canDelete={canDelete}
      canRestore={canRestore}
      canManage={canManage}
      canCreate={canCreate}
      initialData={serializeUsersList(usersData)}
      initialRolesOptions={roles.map((role) => ({
        label: role.displayName,
        value: role.name,
      }))}
    />
  )
}

