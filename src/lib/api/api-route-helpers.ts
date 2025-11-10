/**
 * Helper functions cho API routes
 * Tách logic chung để code ngắn gọn và dễ maintain
 */

import { NextRequest, NextResponse } from "next/server"
import { ApplicationError, NotFoundError } from "@/features/admin/resources/server"
import type { ApiRouteContext } from "./types"

/**
 * Parse request body với error handling
 */
export async function parseRequestBody(req: NextRequest): Promise<Record<string, unknown>> {
  try {
    return await req.json()
  } catch {
    throw new ApplicationError("Dữ liệu không hợp lệ", 400)
  }
}

/**
 * Extract params từ dynamic route args
 */
export async function extractParams<T extends Record<string, string>>(
  args: unknown[]
): Promise<T> {
  const { params } = (args[0] as { params: Promise<T> }) || {}
  if (!params) {
    throw new ApplicationError("Invalid route parameters", 400)
  }
  return await params
}

/**
 * Get user ID from context
 */
export function getUserId(context: ApiRouteContext): string {
  const userId = context.session?.user?.id
  if (!userId) {
    throw new ApplicationError("Unauthorized", 401)
  }
  return userId
}

/**
 * Create auth context for mutations
 */
export function createAuthContext(context: ApiRouteContext, userId: string) {
  return {
    actorId: userId,
    permissions: context.permissions,
    roles: context.roles,
  }
}

/**
 * Handle API errors với proper response
 */
export function handleApiError(
  error: unknown,
  defaultMessage: string,
  defaultStatus: number = 500
): NextResponse {
  if (error instanceof ApplicationError) {
    return NextResponse.json({ error: error.message }, { status: error.status || defaultStatus })
  }
  if (error instanceof NotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 })
  }
  console.error("API error:", error)
  return NextResponse.json({ error: defaultMessage }, { status: defaultStatus })
}

/**
 * Validate required fields
 */
export function validateRequired(
  body: Record<string, unknown>,
  fields: string[]
): void {
  for (const field of fields) {
    if (body[field] === undefined || body[field] === null || body[field] === "") {
      throw new ApplicationError(`${field} là bắt buộc`, 400)
    }
  }
}

/**
 * Extract string value from body
 */
export function getStringValue(body: Record<string, unknown>, key: string): string | undefined {
  return typeof body[key] === "string" ? body[key] : undefined
}

/**
 * Extract array value from body
 */
export function getArrayValue<T>(
  body: Record<string, unknown>,
  key: string,
  validator?: (item: unknown) => item is T
): T[] {
  if (!Array.isArray(body[key])) return []
  if (validator) {
    return body[key].filter(validator)
  }
  return body[key] as T[]
}

