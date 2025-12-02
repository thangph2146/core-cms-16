import { formatDateVi, validateName, validateEmail, validatePhone } from "@/features/admin/resources/utils"

// Re-export common utilities from resources
export { formatDateVi, validateName, validateEmail, validatePhone }

export function validateSubject(value: unknown): { valid: boolean; error?: string } {
  if (!value || typeof value !== "string") {
    return { valid: false, error: "Tiêu đề là bắt buộc" }
  }
  const trimmed = value.trim()
  if (trimmed.length < 3) {
    return { valid: false, error: "Tiêu đề phải có ít nhất 3 ký tự" }
  }
  if (trimmed.length > 200) {
    return { valid: false, error: "Tiêu đề không được vượt quá 200 ký tự" }
  }
  return { valid: true }
}

export function validateContent(value: unknown): { valid: boolean; error?: string } {
  if (!value || typeof value !== "string") {
    return { valid: false, error: "Nội dung là bắt buộc" }
  }
  const trimmed = value.trim()
  if (trimmed.length < 10) {
    return { valid: false, error: "Nội dung phải có ít nhất 10 ký tự" }
  }
  if (trimmed.length > 5000) {
    return { valid: false, error: "Nội dung không được vượt quá 5000 ký tự" }
  }
  return { valid: true }
}

