/**
 * Server Component: Tag Detail
 * 
 * Fetches tag data và pass xuống client component
 * Pattern: Server Component (data fetching) → Client Component (UI/interactions)
 */

import { getTagById } from "../server/queries"
import { serializeTagDetail } from "../server/helpers"
import { TagDetailClient } from "./tag-detail.client"
import type { TagDetailData } from "./tag-detail.client"
import { NotFoundMessage } from "@/features/admin/resources/components"

export interface TagDetailProps {
  tagId: string
  backUrl?: string
}

export async function TagDetail({ tagId, backUrl = "/admin/tags" }: TagDetailProps) {
  const tag = await getTagById(tagId)

  if (!tag) {
    return <NotFoundMessage resourceName="thẻ tag" />
  }

  return (
    <TagDetailClient
      tagId={tagId}
      tag={serializeTagDetail(tag) as TagDetailData}
      backUrl={backUrl}
    />
  )
}

