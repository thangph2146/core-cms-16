import { z } from "zod"

export const CreateSessionSchema = z.object({
  userId: z.string().cuid("ID người dùng không hợp lệ"),
  accessToken: z.string().min(1, "Access token là bắt buộc"),
  refreshToken: z.string().min(1, "Refresh token là bắt buộc"),
  userAgent: z.string().max(500, "User agent không được vượt quá 500 ký tự").nullable().optional(),
  ipAddress: z.string().regex(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/, "Địa chỉ IP không hợp lệ").nullable().optional(),
  isActive: z.boolean().optional(),
  expiresAt: z.string().datetime("Thời gian hết hạn không hợp lệ"),
})

export const UpdateSessionSchema = z.object({
  userId: z.string().cuid("ID người dùng không hợp lệ").optional(),
  accessToken: z.string().min(1, "Access token là bắt buộc").optional(),
  refreshToken: z.string().min(1, "Refresh token là bắt buộc").optional(),
  userAgent: z.string().max(500, "User agent không được vượt quá 500 ký tự").nullable().optional(),
  ipAddress: z.string().regex(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/, "Địa chỉ IP không hợp lệ").nullable().optional(),
  isActive: z.boolean().optional(),
  expiresAt: z.string().datetime("Thời gian hết hạn không hợp lệ").optional(),
})

export const BulkSessionActionSchema = z.object({
  action: z.enum(["delete", "restore", "hard-delete"]),
  ids: z.array(
    z.string().min(1, "ID không được để trống").max(100, "ID quá dài")
  ).min(1, "Danh sách ID không được trống").max(100, "Danh sách ID không được vượt quá 100 phần tử"),
})

export type CreateSessionInput = z.infer<typeof CreateSessionSchema>
export type UpdateSessionInput = z.infer<typeof UpdateSessionSchema>
export type BulkSessionActionInput = z.infer<typeof BulkSessionActionSchema>

