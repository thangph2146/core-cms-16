import { listRoles, getAllPermissionsOptions } from "../server/queries"
import { serializeRolesList } from "../server/helpers"
import { RolesTableClient } from "./roles-table.client"

export interface RolesTableProps {
  canDelete?: boolean
  canRestore?: boolean
  canManage?: boolean
  canCreate?: boolean
}

export async function RolesTable({ canDelete, canRestore, canManage, canCreate }: RolesTableProps) {
  // Sử dụng non-cached functions để đảm bảo data luôn fresh
  // Theo chuẩn Next.js 16: không cache admin data
  const [rolesData, permissions] = await Promise.all([
    listRoles({
      page: 1,
      limit: 10,
      status: "active",
    }),
    getAllPermissionsOptions(),
  ])

  return (
    <RolesTableClient
      canDelete={canDelete}
      canRestore={canRestore}
      canManage={canManage}
      canCreate={canCreate}
      initialData={serializeRolesList(rolesData)}
      initialPermissionsOptions={permissions}
    />
  )
}

