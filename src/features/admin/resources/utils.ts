/**
 * Shared utility functions cho resource features
 * 
 * Các hàm utility chung được dùng bởi nhiều resource features
 */

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
 * Generate slug from name
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with dash
    .replace(/^-+|-+$/g, "") // Remove leading/trailing dashes
}

/**
 * Validate name (minimum 2 characters)
 */
export function validateName(value: unknown): { valid: boolean; error?: string } {
  if (!value || typeof value !== "string") {
    return { valid: false, error: "Tên là bắt buộc" }
  }
  const trimmed = value.trim()
  if (trimmed.length < 2) {
    return { valid: false, error: "Tên phải có ít nhất 2 ký tự" }
  }
  if (trimmed.length > 100) {
    return { valid: false, error: "Tên không được vượt quá 100 ký tự" }
  }
  return { valid: true }
}

/**
 * Validate slug (alphanumeric, dashes)
 */
export function validateSlug(value: unknown): { valid: boolean; error?: string } {
  if (!value || typeof value !== "string") {
    return { valid: false, error: "Slug là bắt buộc" }
  }
  const trimmed = value.trim()
  if (trimmed.length < 2) {
    return { valid: false, error: "Slug phải có ít nhất 2 ký tự" }
  }
  if (!/^[a-z0-9-]+$/.test(trimmed)) {
    return { valid: false, error: "Slug chỉ được chứa chữ thường, số và dấu gạch ngang" }
  }
  return { valid: true }
}

/**
 * Validate email format
 */
export function validateEmail(value: unknown): { valid: boolean; error?: string } {
  if (!value || typeof value !== "string") {
    return { valid: false, error: "Email là bắt buộc" }
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(value.trim())) {
    return { valid: false, error: "Email không hợp lệ" }
  }
  return { valid: true }
}

/**
 * Validate phone (optional, basic format check)
 */
export function validatePhone(value: unknown): { valid: boolean; error?: string } {
  if (!value || value === "") {
    return { valid: true } // Phone is optional
  }
  if (typeof value !== "string") {
    return { valid: false, error: "Số điện thoại không hợp lệ" }
  }
  const phoneRegex = /^[0-9+\-\s()]+$/
  if (!phoneRegex.test(value.trim())) {
    return { valid: false, error: "Số điện thoại chỉ được chứa số, dấu +, -, khoảng trắng và dấu ngoặc" }
  }
  return { valid: true }
}

