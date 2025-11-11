import { NextResponse } from "next/server"

/**
 * Shared API response helpers để đảm bảo đồng nhất giữa tất cả handlers.
 */

export interface ApiResponsePayload<T = unknown> {
  success: boolean
  message?: string
  error?: string | null
  data?: T
}

const DEFAULT_SUCCESS_MESSAGE = "Thao tác thành công"
const DEFAULT_ERROR_MESSAGE = "Đã xảy ra lỗi"

export function createSuccessResponse<T>(
  data?: T,
  options?: { message?: string; status?: number }
): NextResponse<ApiResponsePayload<T>> {
  return NextResponse.json(
    {
      success: true,
      message: options?.message || DEFAULT_SUCCESS_MESSAGE,
      error: null,
      data,
    },
    {
      status: options?.status ?? 200,
    }
  )
}

export function createErrorResponse(
  message?: string,
  options?: { status?: number; error?: string; data?: unknown }
): NextResponse<ApiResponsePayload> {
  return NextResponse.json(
    {
      success: false,
      message: message || DEFAULT_ERROR_MESSAGE,
      error: options?.error || message || DEFAULT_ERROR_MESSAGE,
      data: options?.data,
    },
    {
      status: options?.status ?? 400,
    }
  )
}
