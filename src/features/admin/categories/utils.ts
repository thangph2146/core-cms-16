/**
 * Shared utility functions và validation cho category forms
 */

import { formatDateVi, generateSlug, validateName, validateSlug } from "@/features/admin/resources/utils"

// Re-export common utilities from resources
export { formatDateVi, generateSlug }

// Category-specific validations (extend or override base validations)

/**
 * Validate category name (uses base validateName from resources)
 */
export function validateCategoryName(value: unknown): { valid: boolean; error?: string } {
  return validateName(value)
}

/**
 * Validate category slug (uses base validateSlug from resources)
 */
export function validateCategorySlug(value: unknown): { valid: boolean; error?: string } {
  return validateSlug(value)
}

/**
 * Validate description (optional, max 500 characters)
 */
export function validateDescription(value: unknown): { valid: boolean; error?: string } {
  if (!value || value === "") {
    return { valid: true }
  }
  if (typeof value === "string" && value.length > 500) {
    return { valid: false, error: "Mô tả không được vượt quá 500 ký tự" }
  }
  return { valid: true }
}

