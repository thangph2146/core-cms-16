/**
 * API utility functions for handling HTTP responses
 * Shared across the application
 */

/**
 * Safely parses JSON from a Response object
 */
export async function parseJsonSafe<T>(response: Response): Promise<T | null> {
  try {
    const textBody = await response.clone().text()
    return textBody ? (JSON.parse(textBody) as T) : null
  } catch {
    return null
  }
}

/**
 * Extracts error message from a Response object
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
 * HTTP status code error messages
 */
const STATUS_MESSAGES: Record<number, string> = {
  401: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  403: "Bạn không có quyền thực hiện hành động này.",
  404: "Không tìm thấy tài nguyên.",
  500: "Lỗi máy chủ. Vui lòng thử lại sau.",
}

/**
 * Extracts error message from axios error object
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
    if (axiosError.response?.status) {
      return STATUS_MESSAGES[axiosError.response.status] || defaultMessage
    }
  }
  return error instanceof Error ? error.message : defaultMessage
}

