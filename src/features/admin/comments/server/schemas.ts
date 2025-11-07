/**
 * Zod validation schemas cho comments
 */

import { z } from "zod"

export const UpdateCommentSchema = z.object({
  content: z.string().min(1, "Nội dung bình luận không được để trống").max(1000, "Nội dung bình luận không được vượt quá 1000 ký tự").optional(),
  approved: z.boolean().optional(),
})

export const BulkCommentActionSchema = z.object({
  action: z.enum(["approve", "unapprove", "delete", "restore", "hard-delete"]),
  ids: z.array(z.string().cuid("ID không hợp lệ")).min(1, "Danh sách ID không được trống"),
})

export type UpdateCommentInput = z.infer<typeof UpdateCommentSchema>
export type BulkCommentActionInput = z.infer<typeof BulkCommentActionSchema>

