/**
 * Server Component: Post Edit
 * 
 * Fetches post data và pass xuống client component
 * Pattern: Server Component (data fetching) → Client Component (UI/interactions)
 */

import { getPostDetailById } from "../server/cache"
import { serializePostDetail } from "../server/helpers"
import { PostEditClient } from "./post-edit.client"
import type { PostEditData } from "./post-edit.client"
import { NotFoundMessage } from "@/features/admin/resources/components"

export interface PostEditProps {
  postId: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
  variant?: "dialog" | "sheet" | "page"
  backUrl?: string
  backLabel?: string
}

export async function PostEdit({
  postId,
  open = true,
  onOpenChange,
  onSuccess,
  variant = "dialog",
  backUrl,
  backLabel = "Quay lại",
}: PostEditProps) {
  const post = await getPostDetailById(postId)

  if (!post) {
    return <NotFoundMessage resourceName="bài viết" />
  }

  const postForEdit: PostEditData = {
    ...serializePostDetail(post),
    authorId: post.author.id,
  }

  return (
    <PostEditClient
      post={postForEdit}
      open={open}
      onOpenChange={onOpenChange}
      onSuccess={onSuccess}
      variant={variant}
      backUrl={backUrl}
      backLabel={backLabel}
      postId={postId}
    />
  )
}

