/**
 * Shared utility functions và validation cho session forms
 */

import { formatDateVi } from "@/features/admin/resources/utils"

// Re-export common utilities from resources
export { formatDateVi }

/**
 * Validate IP address format (optional)
 */
export function validateIpAddress(value: unknown): { valid: boolean; error?: string } {
  if (!value || value === "") {
    return { valid: true } // Optional
  }
  if (typeof value !== "string") {
    return { valid: false, error: "Địa chỉ IP không hợp lệ" }
  }
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
  if (!ipRegex.test(value.trim())) {
    return { valid: false, error: "Địa chỉ IP không hợp lệ" }
  }
  return { valid: true }
}

/**
 * Validate user agent (optional, max 500 characters)
 */
export function validateUserAgent(value: unknown): { valid: boolean; error?: string } {
  if (!value || value === "") {
    return { valid: true } // Optional
  }
  if (typeof value !== "string") {
    return { valid: false, error: "User agent không hợp lệ" }
  }
  if (value.length > 500) {
    return { valid: false, error: "User agent không được vượt quá 500 ký tự" }
  }
  return { valid: true }
}

