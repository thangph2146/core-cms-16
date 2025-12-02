import { z } from "zod"

export const CreateStudentSchema = z.object({
  studentCode: z
    .string()
    .min(2, "Mã học sinh phải có ít nhất 2 ký tự")
    .max(50, "Mã học sinh không được vượt quá 50 ký tự")
    .regex(/^[a-zA-Z0-9_-]+$/, "Mã học sinh chỉ được chứa chữ cái, số, dấu gạch dưới và dấu gạch ngang"),
  name: z.string().min(2, "Tên học sinh phải có ít nhất 2 ký tự").max(100, "Tên học sinh không được vượt quá 100 ký tự").nullable().optional(),
  email: z.string().email("Email không hợp lệ").max(255, "Email không được vượt quá 255 ký tự").nullable().optional(),
  userId: z.string().cuid("ID người dùng không hợp lệ").nullable().optional(),
  isActive: z.boolean().optional(),
})

export const UpdateStudentSchema = z.object({
  studentCode: z
    .string()
    .min(2, "Mã học sinh phải có ít nhất 2 ký tự")
    .max(50, "Mã học sinh không được vượt quá 50 ký tự")
    .regex(/^[a-zA-Z0-9_-]+$/, "Mã học sinh chỉ được chứa chữ cái, số, dấu gạch dưới và dấu gạch ngang")
    .optional(),
  name: z.string().min(2, "Tên học sinh phải có ít nhất 2 ký tự").max(100, "Tên học sinh không được vượt quá 100 ký tự").nullable().optional(),
  email: z.string().email("Email không hợp lệ").max(255, "Email không được vượt quá 255 ký tự").nullable().optional(),
  userId: z.string().cuid("ID người dùng không hợp lệ").nullable().optional(),
  isActive: z.boolean().optional(),
})

export const BulkStudentActionSchema = z.object({
  action: z.enum(["delete", "restore", "hard-delete"]),
  ids: z.array(z.string().cuid("ID không hợp lệ")).min(1, "Danh sách ID không được trống"),
})

export type CreateStudentInput = z.infer<typeof CreateStudentSchema>
export type UpdateStudentInput = z.infer<typeof UpdateStudentSchema>
export type BulkStudentActionInput = z.infer<typeof BulkStudentActionSchema>

