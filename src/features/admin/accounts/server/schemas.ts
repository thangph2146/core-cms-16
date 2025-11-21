/**
 * Zod validation schemas cho accounts
 */

import { z } from "zod"

export const UpdateAccountSchema = z.object({
  name: z.string().min(2, "Tên phải có ít nhất 2 ký tự").max(100, "Tên không được vượt quá 100 ký tự").nullable().optional(),
  bio: z.string().max(500, "Tiểu sử không được vượt quá 500 ký tự").nullable().optional(),
  phone: z.string().regex(/^[0-9+\-\s()]+$/, "Số điện thoại chỉ được chứa số, dấu +, -, khoảng trắng và dấu ngoặc").max(20, "Số điện thoại không được vượt quá 20 ký tự").nullable().optional(),
  address: z.string().max(500, "Địa chỉ không được vượt quá 500 ký tự").nullable().optional(),
  password: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự").max(100, "Mật khẩu không được vượt quá 100 ký tự").optional(),
  avatar: z.string().url("URL avatar không hợp lệ").max(500, "URL avatar không được vượt quá 500 ký tự").nullable().optional(),
})

export type UpdateAccountInput = z.infer<typeof UpdateAccountSchema>

