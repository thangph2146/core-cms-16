/**
 * Generate slug from Vietnamese text
 * 
 * Hỗ trợ chuyển đổi tiếng Việt có dấu thành slug URL-friendly
 * Ví dụ: "Hướng dẫn sử dụng" -> "huong-dan-su-dung"
 */

/**
 * Mapping tiếng Việt sang không dấu
 */
const VIETNAMESE_MAP: Record<string, string> = {
  // Vowels
  à: "a", á: "a", ả: "a", ã: "a", ạ: "a",
  ă: "a", ằ: "a", ắ: "a", ẳ: "a", ẵ: "a", ặ: "a",
  â: "a", ầ: "a", ấ: "a", ẩ: "a", ẫ: "a", ậ: "a",
  è: "e", é: "e", ẻ: "e", ẽ: "e", ẹ: "e",
  ê: "e", ề: "e", ế: "e", ể: "e", ễ: "e", ệ: "e",
  ì: "i", í: "i", ỉ: "i", ĩ: "i", ị: "i",
  ò: "o", ó: "o", ỏ: "o", õ: "o", ọ: "o",
  ô: "o", ồ: "o", ố: "o", ổ: "o", ỗ: "o", ộ: "o",
  ơ: "o", ờ: "o", ớ: "o", ở: "o", ỡ: "o", ợ: "o",
  ù: "u", ú: "u", ủ: "u", ũ: "u", ụ: "u",
  ư: "u", ừ: "u", ứ: "u", ử: "u", ữ: "u", ự: "u",
  ỳ: "y", ý: "y", ỷ: "y", ỹ: "y", ỵ: "y",
  đ: "d",
  // Uppercase
  À: "A", Á: "A", Ả: "A", Ã: "A", Ạ: "A",
  Ă: "A", Ằ: "A", Ắ: "A", Ẳ: "A", Ẵ: "A", Ặ: "A",
  Â: "A", Ầ: "A", Ấ: "A", Ẩ: "A", Ẫ: "A", Ậ: "A",
  È: "E", É: "E", Ẻ: "E", Ẽ: "E", Ẹ: "E",
  Ê: "E", Ề: "E", Ế: "E", Ể: "E", Ễ: "E", Ệ: "E",
  Ì: "I", Í: "I", Ỉ: "I", Ĩ: "I", Ị: "I",
  Ò: "O", Ó: "O", Ỏ: "O", Õ: "O", Ọ: "O",
  Ô: "O", Ồ: "O", Ố: "O", Ổ: "O", Ỗ: "O", Ộ: "O",
  Ơ: "O", Ờ: "O", Ớ: "O", Ở: "O", Ỡ: "O", Ợ: "O",
  Ù: "U", Ú: "U", Ủ: "U", Ũ: "U", Ụ: "U",
  Ư: "U", Ừ: "U", Ứ: "U", Ử: "U", Ữ: "U", Ự: "U",
  Ỳ: "Y", Ý: "Y", Ỷ: "Y", Ỹ: "Y", Ỵ: "Y",
  Đ: "D",
}

/**
 * Convert Vietnamese text to slug
 * 
 * @param text - Input text (có thể chứa tiếng Việt có dấu)
 * @returns URL-friendly slug
 * 
 * @example
 * generateSlug("Hướng dẫn sử dụng") // "huong-dan-su-dung"
 * generateSlug("Bài viết về React") // "bai-viet-ve-react"
 */
export function generateSlug(text: string): string {
  if (!text || typeof text !== "string") return ""

  let slug = text.trim()

  // Replace Vietnamese characters
  for (const [vietnamese, replacement] of Object.entries(VIETNAMESE_MAP)) {
    slug = slug.replaceAll(vietnamese, replacement)
  }

  // Normalize remaining diacritics (fallback for any missed characters)
  slug = slug.normalize("NFD").replace(/[\u0300-\u036f]/g, "")

  // Convert to lowercase and replace spaces/special chars with dashes
  slug = slug.toLowerCase().replace(/[^a-z0-9]+/g, "-")

  // Remove leading and trailing dashes
  return slug.replace(/^-+|-+$/g, "")
}

