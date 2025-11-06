/**
 * Server Component: Tag Edit
 * 
 * Fetches tag data, sau đó pass xuống client component
 * Pattern: Server Component (data fetching) → Client Component (UI/interactions)
 */

import { getTagDetailById } from "../server/cache"
import { serializeTagDetail } from "../server/helpers"
import { TagEditClient } from "./tag-edit.client"
import type { TagEditClientProps } from "./tag-edit.client"

export interface TagEditProps {
  tagId: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
  variant?: "dialog" | "sheet" | "page"
  backUrl?: string
  backLabel?: string
}

export async function TagEdit({
  tagId,
  open = true,
  onOpenChange,
  onSuccess,
  variant = "dialog",
  backUrl,
  backLabel = "Quay lại",
}: TagEditProps) {
  const tag = await getTagDetailById(tagId)

  if (!tag) {
    return null
  }

  const tagForEdit: TagEditClientProps["tag"] = {
    ...serializeTagDetail(tag),
  }

  return (
    <TagEditClient
      tag={tagForEdit}
      open={open}
      onOpenChange={onOpenChange}
      onSuccess={onSuccess}
      variant={variant}
      backUrl={backUrl}
      backLabel={backLabel}
      tagId={tagId}
    />
  )
}

