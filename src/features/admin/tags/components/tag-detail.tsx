/**
 * Server Component: Tag Detail
 * 
 * Fetches tag data và pass xuống client component
 * Pattern: Server Component (data fetching) → Client Component (UI/interactions)
 */

import { getTagDetailById } from "../server/cache"
import { serializeTagDetail } from "../server/helpers"
import { TagDetailClient } from "./tag-detail.client"
import type { TagDetailData } from "./tag-detail.client"

export interface TagDetailProps {
  tagId: string
  backUrl?: string
}

export async function TagDetail({ tagId, backUrl = "/admin/tags" }: TagDetailProps) {
  const tag = await getTagDetailById(tagId)

  if (!tag) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4 md:p-6 lg:p-8">
        <div className="text-center">
          <p className="text-muted-foreground">Không tìm thấy thẻ tag</p>
        </div>
      </div>
    )
  }

  return (
    <TagDetailClient
      tagId={tagId}
      tag={serializeTagDetail(tag) as TagDetailData}
      backUrl={backUrl}
    />
  )
}

