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

