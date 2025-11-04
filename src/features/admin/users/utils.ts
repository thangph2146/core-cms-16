/**
 * Shared utility functions và validation cho user forms
 */

export interface Role {
  id: string
  name: string
  displayName: string
}

/**
 * Normalize roleIds từ single value hoặc array thành array
 */
export function normalizeRoleIds(roleIds: unknown): string[] {
  if (roleIds === undefined || roleIds === null || roleIds === "") {
    return []
  }
  if (Array.isArray(roleIds)) {
    return roleIds.filter((id): id is string => typeof id === "string" && id !== "")
  }
  if (typeof roleIds === "string" && roleIds !== "") {
    return [roleIds]
  }
  return []
}

/**
 * Validate email format
 */
export function validateEmail(value: unknown): { valid: boolean; error?: string } {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (typeof value !== "string" || !emailRegex.test(value)) {
    return { valid: false, error: "Email không hợp lệ" }
  }
  return { valid: true }
}

/**
 * Validate name (minimum 2 characters)
 */
export function validateName(value: unknown): { valid: boolean; error?: string } {
  if (value && typeof value === "string" && value.trim().length < 2) {
    return { valid: false, error: "Tên phải có ít nhất 2 ký tự" }
  }
  return { valid: true }
}

/**
 * Validate password (minimum 6 characters, empty allowed for edit)
 */
export function validatePassword(value: unknown, allowEmpty = false): { valid: boolean; error?: string } {
  if (allowEmpty && (!value || value === "")) {
    return { valid: true }
  }
  if (!value || value === "" || typeof value !== "string") {
    return { valid: false, error: "Mật khẩu là bắt buộc" }
  }
  if (value.length < 6) {
    return { valid: false, error: "Mật khẩu phải có ít nhất 6 ký tự" }
  }
  return { valid: true }
}

/**
 * Format date to Vietnamese locale
 */
export function formatDateVi(date: string | Date): string {
  return new Date(date).toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/**
 * Get user initials from name or email
 */
export function getUserInitials(name?: string | null, email?: string): string {
  if (name) {
    const parts = name.trim().split(" ")
    return parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : name.substring(0, 2).toUpperCase()
  }
  return email ? email.substring(0, 2).toUpperCase() : "U"
}

