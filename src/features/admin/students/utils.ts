import { formatDateVi, validateName, validateEmail } from "@/features/admin/resources/utils"

// Re-export common utilities from resources
export { formatDateVi, validateName, validateEmail }

export function validateStudentCode(value: unknown): { valid: boolean; error?: string } {
  if (!value || typeof value !== "string" || value.trim() === "") {
    return { valid: false, error: "Mã học sinh là bắt buộc" }
  }
  const trimmed = value.trim()
  if (trimmed.length < 2) {
    return { valid: false, error: "Mã học sinh phải có ít nhất 2 ký tự" }
  }
  if (trimmed.length > 50) {
    return { valid: false, error: "Mã học sinh không được vượt quá 50 ký tự" }
  }
  // Allow alphanumeric, underscore, and hyphen
  const codeRegex = /^[a-zA-Z0-9_-]+$/
  if (!codeRegex.test(trimmed)) {
    return {
      valid: false,
      error: "Mã học sinh chỉ được chứa chữ cái, số, dấu gạch dưới và dấu gạch ngang",
    }
  }
  return { valid: true }
}

