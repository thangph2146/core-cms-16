/**
 * Server Component: Sessions Table
 * 
 * Fetches initial data, sau đó pass xuống client component
 * Pattern: Server Component (data fetching) → Client Component (UI/interactions)
 */

import { listSessionsCached } from "../server/cache"
import { serializeSessionsList } from "../server/helpers"
import { SessionsTableClient } from "./sessions-table.client"
import { getActiveUsersForSelectCached } from "@/features/admin/users/server/cache"

export interface SessionsTableProps {
  canDelete?: boolean
  canRestore?: boolean
  canManage?: boolean
  canCreate?: boolean
}

export async function SessionsTable({ canDelete, canRestore, canManage, canCreate }: SessionsTableProps) {
  const [sessionsData, usersOptions] = await Promise.all([
    listSessionsCached({
      page: 1,
      limit: 10,
      status: "active",
    }),
    getActiveUsersForSelectCached(100),
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

