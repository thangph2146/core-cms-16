/**
 * API utility functions for handling HTTP responses
 * Shared across the application
 */

/**
 * Safely parses JSON from a Response object
 * @param response - The Response object to parse
 * @returns Parsed JSON object or null if parsing fails
 */
export async function parseJsonSafe<T>(response: Response): Promise<T | null> {
  try {
    const clone = response.clone()
    const textBody = await clone.text()
    if (!textBody) return null
    return JSON.parse(textBody) as T
  } catch {
    return null
  }
}

/**
 * Extracts error message from a Response object
 * @param response - The Response object to extract error from
 * @returns Error message string
 */
export async function extractErrorMessage(response: Response): Promise<string> {
  const data = await parseJsonSafe<{ error?: string; message?: string }>(response)
  if (data) {
    if (typeof data.error === "string") return data.error
    if (typeof data.message === "string") return data.message
    return JSON.stringify(data)
  }
  try {
    return await response.clone().text()
  } catch {
    return "Không xác định"
  }
}

/**
 * Extracts error message from axios error object
 * @param error - The error object from axios catch
 * @param defaultMessage - Default message if extraction fails
 * @returns Error message string
 */
export function extractAxiosErrorMessage(
  error: unknown,
  defaultMessage = "Đã xảy ra lỗi"
): string {
  if (error && typeof error === "object" && "response" in error) {
    const axiosError = error as { response?: { data?: { error?: string }; status?: number } }
    if (axiosError.response?.data?.error) {
      return axiosError.response.data.error
    }
    if (axiosError.response?.status === 500) {
      return "Lỗi máy chủ. Vui lòng thử lại sau."
    }
    if (axiosError.response?.status === 404) {
      return "Không tìm thấy tài nguyên."
    }
    if (axiosError.response?.status === 403) {
      return "Bạn không có quyền thực hiện hành động này."
    }
    if (axiosError.response?.status === 401) {
      return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
    }
  }
  if (error instanceof Error) {
    return error.message
  }
  return defaultMessage
}

