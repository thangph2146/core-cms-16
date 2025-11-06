/**
 * Zod validation schemas cho roles
 */

import { z } from "zod"
import { PERMISSIONS } from "@/lib/permissions"

// Get all permission values for validation
const allPermissions = Object.values(PERMISSIONS) as string[]

// Custom validation function for permissions
const permissionSchema = z.string().refine(
  (val) => allPermissions.includes(val),
  { message: "Quyền không hợp lệ" }
)

export const CreateRoleSchema = z.object({
  name: z
    .string()
    .min(2, "Tên vai trò phải có ít nhất 2 ký tự")
    .max(100, "Tên vai trò không được vượt quá 100 ký tự")
    .regex(/^[a-z0-9_-]+$/, "Tên vai trò chỉ được chứa chữ thường, số, dấu gạch dưới và dấu gạch ngang"),
  displayName: z
    .string()
    .min(2, "Tên hiển thị phải có ít nhất 2 ký tự")
    .max(100, "Tên hiển thị không được vượt quá 100 ký tự"),
  description: z.string().max(500, "Mô tả không được vượt quá 500 ký tự").nullable().optional(),
  permissions: z.array(permissionSchema).optional(),
  isActive: z.boolean().optional(),
})

export const UpdateRoleSchema = z.object({
  name: z
    .string()
    .min(2, "Tên vai trò phải có ít nhất 2 ký tự")
    .max(100, "Tên vai trò không được vượt quá 100 ký tự")
    .regex(/^[a-z0-9_-]+$/, "Tên vai trò chỉ được chứa chữ thường, số, dấu gạch dưới và dấu gạch ngang")
    .optional(),
  displayName: z
    .string()
    .min(2, "Tên hiển thị phải có ít nhất 2 ký tự")
    .max(100, "Tên hiển thị không được vượt quá 100 ký tự")
    .optional(),
  description: z.string().max(500, "Mô tả không được vượt quá 500 ký tự").nullable().optional(),
  permissions: z.array(permissionSchema).optional(),
  isActive: z.boolean().optional(),
})

export const BulkRoleActionSchema = z.object({
  action: z.enum(["delete", "restore", "hard-delete"]),
  ids: z.array(z.string().cuid("ID không hợp lệ")).min(1, "Danh sách ID không được trống"),
})

export type CreateRoleInput = z.infer<typeof CreateRoleSchema>
export type UpdateRoleInput = z.infer<typeof UpdateRoleSchema>
export type BulkRoleActionInput = z.infer<typeof BulkRoleActionSchema>

