import { z } from "zod"

export const createUserSchema = z.object({
  email: z.string().email("Email không hợp lệ").min(1, "Email là bắt buộc"),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
  name: z.string().optional().nullable(),
  roleIds: z.array(z.string().cuid()).optional(),
  isActive: z.boolean().optional(),
  bio: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
})

export const updateUserSchema = z.object({
  email: z.string().email("Email không hợp lệ").optional(),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự").optional(),
  name: z.string().optional().nullable(),
  roleIds: z.array(z.string().cuid()).optional(),
  isActive: z.boolean().optional(),
  bio: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
})

export type CreateUserSchema = z.infer<typeof createUserSchema>
export type UpdateUserSchema = z.infer<typeof updateUserSchema>

