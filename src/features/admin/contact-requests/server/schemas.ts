/**
 * Zod validation schemas cho contact requests
 */

import { z } from "zod"

export const ContactStatusSchema = z.enum(["NEW", "IN_PROGRESS", "RESOLVED", "CLOSED"])
export const ContactPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"])

export const CreateContactRequestSchema = z.object({
  name: z.string().min(2, "Tên người liên hệ phải có ít nhất 2 ký tự").max(100, "Tên người liên hệ không được vượt quá 100 ký tự"),
  email: z.string().email("Email không hợp lệ").max(255, "Email không được vượt quá 255 ký tự"),
  phone: z.string().regex(/^[0-9+\-\s()]+$/, "Số điện thoại chỉ được chứa số, dấu +, -, khoảng trắng và dấu ngoặc").max(20, "Số điện thoại không được vượt quá 20 ký tự").nullable().optional(),
  subject: z.string().min(3, "Tiêu đề phải có ít nhất 3 ký tự").max(200, "Tiêu đề không được vượt quá 200 ký tự"),
  content: z.string().min(10, "Nội dung phải có ít nhất 10 ký tự").max(5000, "Nội dung không được vượt quá 5000 ký tự"),
  status: ContactStatusSchema.optional(),
  priority: ContactPrioritySchema.optional(),
})

export const UpdateContactRequestSchema = z.object({
  name: z.string().min(2, "Tên người liên hệ phải có ít nhất 2 ký tự").max(100, "Tên người liên hệ không được vượt quá 100 ký tự").optional(),
  email: z.string().email("Email không hợp lệ").max(255, "Email không được vượt quá 255 ký tự").optional(),
  phone: z.string().regex(/^[0-9+\-\s()]+$/, "Số điện thoại chỉ được chứa số, dấu +, -, khoảng trắng và dấu ngoặc").max(20, "Số điện thoại không được vượt quá 20 ký tự").nullable().optional(),
  subject: z.string().min(3, "Tiêu đề phải có ít nhất 3 ký tự").max(200, "Tiêu đề không được vượt quá 200 ký tự").optional(),
  content: z.string().min(10, "Nội dung phải có ít nhất 10 ký tự").max(5000, "Nội dung không được vượt quá 5000 ký tự").optional(),
  status: ContactStatusSchema.optional(),
  priority: ContactPrioritySchema.optional(),
  assignedToId: z.string().cuid("ID người được giao không hợp lệ").nullable().optional(),
  isRead: z.boolean().optional(),
})

export const AssignContactRequestSchema = z.object({
  assignedToId: z.string().cuid("ID người được giao không hợp lệ").nullable(),
})

export const BulkContactRequestActionSchema = z.object({
  action: z.enum(["delete", "restore", "hard-delete"]),
  ids: z.array(z.string().cuid("ID không hợp lệ")).min(1, "Danh sách ID không được trống"),
})

export type CreateContactRequestInput = z.infer<typeof CreateContactRequestSchema>
export type UpdateContactRequestInput = z.infer<typeof UpdateContactRequestSchema>
export type AssignContactRequestInput = z.infer<typeof AssignContactRequestSchema>
export type BulkContactRequestActionInput = z.infer<typeof BulkContactRequestActionSchema>

