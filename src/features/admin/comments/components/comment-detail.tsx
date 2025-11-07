/**
 * Server Component: Comment Detail
 * 
 * Fetches comment data và pass xuống client component
 * Pattern: Server Component (data fetching) → Client Component (UI/interactions)
 */

import { getCommentDetailById } from "../server/cache"
import { serializeCommentDetail } from "../server/helpers"
import { CommentDetailClient } from "./comment-detail.client"
import type { CommentDetailData } from "./comment-detail.client"
import { getPermissions, getSession } from "@/lib/auth/auth-server"
import { canPerformAction } from "@/lib/permissions"
import { PERMISSIONS } from "@/lib/permissions"

interface SessionWithMeta {
  roles?: Array<{ name: string }>
  permissions?: Array<string>
}

export interface CommentDetailProps {
  commentId: string
  backUrl?: string
}

export async function CommentDetail({ commentId, backUrl = "/admin/comments" }: CommentDetailProps) {
  const comment = await getCommentDetailById(commentId)
  const session = (await getSession()) as SessionWithMeta | null
  const permissions = await getPermissions()
  const roles = session?.roles ?? []

  // Check permission for approve action
  const canApprove = canPerformAction(permissions, roles, PERMISSIONS.COMMENTS_APPROVE)

  if (!comment) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4 md:p-6 lg:p-8">
        <div className="text-center">
          <p className="text-muted-foreground">Không tìm thấy bình luận</p>
        </div>
      </div>
    )
  }

  return (
    <CommentDetailClient
      comment={serializeCommentDetail(comment) as CommentDetailData}
      backUrl={backUrl}
      canApprove={canApprove}
    />
  )
}

