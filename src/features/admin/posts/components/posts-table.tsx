
import { listPosts } from "../server/queries"
import { serializePostsList } from "../server/helpers"
import { PostsTableClient } from "./posts-table.client"

export interface PostsTableProps {
  canDelete?: boolean
  canRestore?: boolean
  canManage?: boolean
  canCreate?: boolean
}

export async function PostsTable({ canDelete, canRestore, canManage, canCreate }: PostsTableProps) {
  // Theo chuẩn Next.js 16: không cache admin data
  const postsData = await listPosts({
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

