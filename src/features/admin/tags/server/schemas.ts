import { z } from "zod"

export const CreateTagSchema = z.object({
  name: z.string().min(2, "Tên thẻ tag phải có ít nhất 2 ký tự").max(100, "Tên thẻ tag không được vượt quá 100 ký tự"),
  slug: z.string().min(2, "Slug phải có ít nhất 2 ký tự").max(100, "Slug không được vượt quá 100 ký tự").regex(/^[a-z0-9-]+$/, "Slug chỉ được chứa chữ thường, số và dấu gạch ngang"),
})

export const UpdateTagSchema = z.object({
  name: z.string().min(2, "Tên thẻ tag phải có ít nhất 2 ký tự").max(100, "Tên thẻ tag không được vượt quá 100 ký tự").optional(),
  slug: z.string().min(2, "Slug phải có ít nhất 2 ký tự").max(100, "Slug không được vượt quá 100 ký tự").regex(/^[a-z0-9-]+$/, "Slug chỉ được chứa chữ thường, số và dấu gạch ngang").optional(),
})

export const BulkTagActionSchema = z.object({
  action: z.enum(["delete", "restore", "hard-delete"]),
  ids: z.array(z.string().cuid("ID không hợp lệ")).min(1, "Danh sách ID không được trống"),
})

export type CreateTagInput = z.infer<typeof CreateTagSchema>
export type UpdateTagInput = z.infer<typeof UpdateTagSchema>
export type BulkTagActionInput = z.infer<typeof BulkTagActionSchema>

