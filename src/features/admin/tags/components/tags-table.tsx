import { listTags } from "../server/queries"
import { serializeTagsList } from "../server/helpers"
import { TagsTableClient } from "./tags-table.client"

export interface TagsTableProps {
  canDelete?: boolean
  canRestore?: boolean
  canManage?: boolean
  canCreate?: boolean
}

export async function TagsTable({ canDelete, canRestore, canManage, canCreate }: TagsTableProps) {
  // Sử dụng listTags (non-cached) để đảm bảo data luôn fresh
  // Theo chuẩn Next.js 16: không cache admin data
  const tagsData = await listTags({
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

