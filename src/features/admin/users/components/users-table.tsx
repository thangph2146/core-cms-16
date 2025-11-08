/**
 * Server Component: Users Table
 * 
 * Fetches initial data và roles, sau đó pass xuống client component
 * Pattern: Server Component (data fetching) → Client Component (UI/interactions)
 * 
 * Theo Next.js 16 best practices:
 * - Sử dụng Promise.all để fetch multiple data sources song song
 * - Data được stream progressive với Suspense boundaries ở page level
 * - Promise.all cho phép fetch usersData và roles đồng thời, không block lẫn nhau
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
  // Fetch usersData và roles song song với Promise.all
  // Cả hai đều cần thiết để render table, nên fetch song song là tối ưu nhất
  const [usersData, roles] = await Promise.all([
    listUsersCached({
      page: 1,
      limit: 10,
      status: "active",
    }),
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

