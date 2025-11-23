/**
 * Server Component: Post Detail
 * 
 * Fetches post data và pass xuống client component
 * Pattern: Server Component (data fetching) → Client Component (UI/interactions)
 */

import { getPostById } from "../server/queries"
import { serializePostDetail } from "../server/helpers"
import { PostDetailClient } from "./post-detail.client"
import type { PostDetailData } from "./post-detail.client"
import { NotFoundMessage } from "@/features/admin/resources/components"

export interface PostDetailProps {
  postId: string
  backUrl?: string
}

export async function PostDetail({ postId, backUrl = "/admin/posts" }: PostDetailProps) {
  const post = await getPostById(postId)

  if (!post) {
    return <NotFoundMessage resourceName="bài viết" />
  }

  return (
    <PostDetailClient
      postId={postId}
      post={serializePostDetail(post) as PostDetailData}
      backUrl={backUrl}
    />
  )
}

// Set displayName để tránh lỗi Performance API
PostDetail.displayName = "PostDetail"

