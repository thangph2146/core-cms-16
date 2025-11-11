/**
 * Server Component: Posts Table
 * 
 * Fetches initial data, sau đó pass xuống client component
 * Pattern: Server Component (data fetching) → Client Component (UI/interactions)
 * 
 * Theo Next.js 16 best practices:
 * - Sử dụng Promise.all để fetch multiple data sources song song
 * - Data được stream progressive với Suspense boundaries ở page level
 */

import { listPostsCached } from "../server/cache"
import { serializePostsList } from "../server/helpers"
import { PostsTableClient } from "./posts-table.client"

export interface PostsTableProps {
  canDelete?: boolean
  canRestore?: boolean
  canManage?: boolean
  canCreate?: boolean
}

export async function PostsTable({ canDelete, canRestore, canManage, canCreate }: PostsTableProps) {
  // Fetch posts data
  const postsData = await listPostsCached({
    page: 1,
    limit: 10,
    status: "active",
  })

  return (
    <PostsTableClient
      canDelete={canDelete}
      canRestore={canRestore}
      canManage={canManage}
      canCreate={canCreate}
      initialData={serializePostsList(postsData)}
    />
  )
}

