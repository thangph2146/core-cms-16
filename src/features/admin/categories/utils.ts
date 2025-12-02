import { formatDateVi, generateSlug, validateName, validateSlug, validateDescription } from "@/features/admin/resources/utils"

// Re-export common utilities from resources
export { formatDateVi, generateSlug, validateDescription }

// Category-specific validations (extend or override base validations)

export function validateCategoryName(value: unknown): { valid: boolean; error?: string } {
  return validateName(value)
}

export function validateCategorySlug(value: unknown): { valid: boolean; error?: string } {
  return validateSlug(value)
}

