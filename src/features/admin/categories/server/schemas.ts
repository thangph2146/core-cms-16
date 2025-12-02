import { z } from "zod"

export const CreateCategorySchema = z.object({
  name: z.string().min(2, "Tên danh mục phải có ít nhất 2 ký tự").max(100, "Tên danh mục không được vượt quá 100 ký tự"),
  slug: z.string().min(2, "Slug phải có ít nhất 2 ký tự").max(100, "Slug không được vượt quá 100 ký tự").regex(/^[a-z0-9-]+$/, "Slug chỉ được chứa chữ thường, số và dấu gạch ngang").optional(),
  description: z.string().max(500, "Mô tả không được vượt quá 500 ký tự").nullable().optional(),
})

export const UpdateCategorySchema = z.object({
  name: z.string().min(2, "Tên danh mục phải có ít nhất 2 ký tự").max(100, "Tên danh mục không được vượt quá 100 ký tự").optional(),
  slug: z.string().min(2, "Slug phải có ít nhất 2 ký tự").max(100, "Slug không được vượt quá 100 ký tự").regex(/^[a-z0-9-]+$/, "Slug chỉ được chứa chữ thường, số và dấu gạch ngang").optional(),
  description: z.string().max(500, "Mô tả không được vượt quá 500 ký tự").nullable().optional(),
})

export const BulkCategoryActionSchema = z.object({
  action: z.enum(["delete", "restore", "hard-delete"]),
  ids: z.array(z.string().cuid("ID không hợp lệ")).min(1, "Danh sách ID không được trống"),
})

export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>
export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>
export type BulkCategoryActionInput = z.infer<typeof BulkCategoryActionSchema>

