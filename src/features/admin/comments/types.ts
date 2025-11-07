/**
 * Types cho comments feature
 */

import type { ResourceResponse, BaseResourceTableClientProps } from "@/features/admin/resources/types"

export interface CommentRow {
  id: string
  content: string
  approved: boolean
  authorName: string | null
  authorEmail: string
  postTitle: string
  postId: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface CommentsTableClientProps extends BaseResourceTableClientProps<CommentRow> {
  canApprove?: boolean
}

export type CommentsResponse = ResourceResponse<CommentRow>

export interface ListCommentsInput {
  page?: number
  limit?: number
  search?: string
  sortBy?: string
  sortOrder?: "asc" | "desc"
  filters?: {
    approved?: boolean
    authorId?: string
    postId?: string
    deleted?: boolean
  }
}

export interface ListedComment {
  id: string
  content: string
  approved: boolean
  authorId: string
  authorName: string | null
  authorEmail: string
  postId: string
  postTitle: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface CommentDetail {
  id: string
  content: string
  approved: boolean
  authorId: string
  authorName: string | null
  authorEmail: string
  postId: string
  postTitle: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface ListCommentsResult {
  data: ListedComment[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface BulkActionResult {
  success: boolean
  message: string
  affected: number
}

// Types are now exported from schemas.ts
export type { UpdateCommentInput, BulkCommentActionInput } from "./server/schemas"

