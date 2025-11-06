/**
 * Shared utility functions và validation cho role forms
 */

import { formatDateVi, validateDescription } from "@/features/admin/resources/utils"

// Re-export common utilities from resources
export { formatDateVi, validateDescription }

/**
 * Validate role name (minimum 2 characters, alphanumeric and underscore only)
 */
export function validateRoleName(value: unknown): { valid: boolean; error?: string } {
  if (!value || typeof value !== "string" || value.trim() === "") {
    return { valid: false, error: "Tên vai trò là bắt buộc" }
  }
  const trimmed = value.trim()
  if (trimmed.length < 2) {
    return { valid: false, error: "Tên vai trò phải có ít nhất 2 ký tự" }
  }
  // Allow alphanumeric, underscore, and hyphen
  const nameRegex = /^[a-z0-9_-]+$/
  if (!nameRegex.test(trimmed)) {
    return {
      valid: false,
      error: "Tên vai trò chỉ được chứa chữ thường, số, dấu gạch dưới và dấu gạch ngang",
    }
  }
  return { valid: true }
}

/**
 * Validate display name (minimum 2 characters)
 */
export function validateDisplayName(value: unknown): { valid: boolean; error?: string } {
  if (!value || typeof value !== "string" || value.trim() === "") {
    return { valid: false, error: "Tên hiển thị là bắt buộc" }
  }
  if (value.trim().length < 2) {
    return { valid: false, error: "Tên hiển thị phải có ít nhất 2 ký tự" }
  }
  return { valid: true }
}

/**
 * Validate permissions array
 */
export function validatePermissions(value: unknown): { valid: boolean; error?: string } {
  if (value === undefined || value === null) {
    return { valid: true } // Optional field
  }
  if (!Array.isArray(value)) {
    return { valid: false, error: "Quyền phải là một mảng" }
  }
  for (const perm of value) {
    if (typeof perm !== "string" || perm.trim() === "") {
      return { valid: false, error: "Mỗi quyền phải là một chuỗi không rỗng" }
    }
  }
  return { valid: true }
}

