/**
 * Utility Functions for Posts
 */

/**
 * Format date to Vietnamese format
 */
export function formatDateVi(date: string | Date | null | undefined): string {
  if (!date) return "—"
  
  try {
    const dateObj = typeof date === "string" ? new Date(date) : date
    if (isNaN(dateObj.getTime())) return "—"
    
    return new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "long",
      timeStyle: "short",
    }).format(dateObj)
  } catch {
    return "—"
  }
}

