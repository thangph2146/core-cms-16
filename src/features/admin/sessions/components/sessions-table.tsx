import { listSessions } from "../server/queries"
import { serializeSessionsList } from "../server/helpers"
import { SessionsTableClient } from "./sessions-table.client"
import { getActiveUsersForSelect } from "@/features/admin/users/server/queries"

export interface SessionsTableProps {
  canDelete?: boolean
  canRestore?: boolean
  canManage?: boolean
  canCreate?: boolean
}

export async function SessionsTable({ canDelete, canRestore, canManage, canCreate }: SessionsTableProps) {
  // Sử dụng non-cached functions để đảm bảo data luôn fresh
  // Theo chuẩn Next.js 16: không cache admin data
  const [sessionsData, usersOptions] = await Promise.all([
    listSessions({
      page: 1,
      limit: 10,
      status: "active",
    }),
    getActiveUsersForSelect(100),
  ])

  return (
    <SessionsTableClient
      canDelete={canDelete}
      canRestore={canRestore}
      canManage={canManage}
      canCreate={canCreate}
      initialData={serializeSessionsList(sessionsData)}
      initialUsersOptions={usersOptions}
    />
  )
}

