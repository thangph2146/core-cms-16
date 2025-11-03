import { listUsersCached } from "@/features/users/server/queries"
import type { DataTableResult } from "@/components/data-table"
import { UsersTableClient, type UserRow } from "./users-table.client"

export interface UsersTableProps {
  canDelete?: boolean
  canRestore?: boolean
}

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

export async function UsersTable({ canDelete, canRestore }: UsersTableProps) {
  const initial = await listUsersCached(1, 10, "", "", "active")
  const initialData = serializeInitialData(initial)

  return (
    <UsersTableClient
      canDelete={canDelete}
      canRestore={canRestore}
      initialData={initialData}
    />
  )
}

