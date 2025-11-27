
import { listUsers, getActiveRoles } from "../server/queries"
import { serializeUsersList } from "../server/helpers"
import { UsersTableClient } from "./users-table.client"

export interface UsersTableProps {
  canDelete?: boolean
  canRestore?: boolean
  canManage?: boolean
  canCreate?: boolean
}

export async function UsersTable({ canDelete, canRestore, canManage, canCreate }: UsersTableProps) {
  // Sử dụng non-cached functions để đảm bảo data luôn fresh
  // Theo chuẩn Next.js 16: không cache admin data
  // Fetch usersData và roles song song với Promise.all
  const [usersData, roles] = await Promise.all([
    listUsers({
      page: 1,
      limit: 10,
      status: "active",
    }),
    getActiveRoles(),
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

