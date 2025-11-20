/**
 * API Route: POST /api/admin/sessions/bulk - Bulk operations
 */
import { NextRequest, NextResponse } from "next/server"
import {
  bulkSoftDeleteSessions,
  bulkRestoreSessions,
  bulkHardDeleteSessions,
  type AuthContext,
  ApplicationError,
} from "@/features/admin/sessions/server/mutations"
import { BulkSessionActionSchema } from "@/features/admin/sessions/server/schemas"
import { createPostRoute } from "@/lib/api/api-route-wrapper"
import type { ApiRouteContext } from "@/lib/api/types"

async function bulkSessionsHandler(req: NextRequest, context: ApiRouteContext) {
  let body: unknown
  try {
    body = await req.json()
  } catch (error) {
    console.error("Error parsing request body:", error)
    return NextResponse.json({ error: "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại." }, { status: 400 })
  }

  // Validate với zod
  const validationResult = BulkSessionActionSchema.safeParse(body)
  if (!validationResult.success) {
    const firstError = validationResult.error.issues[0]
    const allErrors = validationResult.error.issues.map(issue => ({
      path: issue.path.join("."),
      message: issue.message,
    }))
    console.error("Validation error:", { body, errors: allErrors })
    return NextResponse.json({ 
      error: firstError?.message || "Dữ liệu không hợp lệ",
      details: allErrors.length > 1 ? allErrors : undefined
    }, { status: 400 })
  }

  const validatedBody = validationResult.data

  const ctx: AuthContext = {
    actorId: context.session.user?.id ?? "unknown",
    permissions: context.permissions,
    roles: context.roles,
  }

  try {
    let result
    if (validatedBody.action === "delete") {
      result = await bulkSoftDeleteSessions(ctx, validatedBody.ids)
    } else if (validatedBody.action === "restore") {
      result = await bulkRestoreSessions(ctx, validatedBody.ids)
    } else if (validatedBody.action === "hard-delete") {
      result = await bulkHardDeleteSessions(ctx, validatedBody.ids)
    } else {
      return NextResponse.json({ error: "Action không hợp lệ" }, { status: 400 })
    }

    return NextResponse.json({ data: result })
  } catch (error) {
    if (error instanceof ApplicationError) {
      return NextResponse.json({ error: error.message || "Không thể thực hiện thao tác hàng loạt" }, { status: error.status || 400 })
    }
    console.error("Error in bulk sessions operation:", error)
    return NextResponse.json({ error: "Đã xảy ra lỗi khi thực hiện thao tác hàng loạt" }, { status: 500 })
  }
}

export const POST = createPostRoute(bulkSessionsHandler)

