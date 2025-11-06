/**
 * Server Component: Tags Table
 * 
 * Fetches initial data, sau đó pass xuống client component
 * Pattern: Server Component (data fetching) → Client Component (UI/interactions)
 */

import { listTagsCached } from "../server/cache"
import { serializeTagsList } from "../server/helpers"
import { TagsTableClient } from "./tags-table.client"

export interface TagsTableProps {
  canDelete?: boolean
  canRestore?: boolean
  canManage?: boolean
  canCreate?: boolean
}

export async function TagsTable({ canDelete, canRestore, canManage, canCreate }: TagsTableProps) {
  const tagsData = await listTagsCached({
    page: 1,
    limit: 10,
    status: "active",
  })

  return (
    <TagsTableClient
      canDelete={canDelete}
      canRestore={canRestore}
      canManage={canManage}
      canCreate={canCreate}
      initialData={serializeTagsList(tagsData)}
    />
  )
}

