/**
 * Server Component: Comment Detail
 * 
 * Fetches comment data và pass xuống client component
 * Pattern: Server Component (data fetching) → Client Component (UI/interactions)
 */

import { getCommentById } from "../server/queries"
import { serializeCommentDetail } from "../server/helpers"
import { CommentDetailClient } from "./comment-detail.client"
import type { CommentDetailData } from "./comment-detail.client"
import { getAuthInfo } from "@/features/admin/resources/server"
import { NotFoundMessage } from "@/features/admin/resources/components"
import { canPerformAction, PERMISSIONS } from "@/lib/permissions"

export interface CommentDetailProps {
  commentId: string
  backUrl?: string
}

export async function CommentDetail({ commentId, backUrl = "/admin/comments" }: CommentDetailProps) {
  const [comment, { permissions, roles }] = await Promise.all([
    getCommentById(commentId),
    getAuthInfo(),
  ])

  // Check permission for approve action
  const canApprove = canPerformAction(permissions, roles, PERMISSIONS.COMMENTS_APPROVE)

  if (!comment) {
    return <NotFoundMessage resourceName="bình luận" />
  }

  return (
    <CommentDetailClient
      commentId={commentId}
      comment={serializeCommentDetail(comment) as CommentDetailData}
      backUrl={backUrl}
      canApprove={canApprove}
    />
  )
}

