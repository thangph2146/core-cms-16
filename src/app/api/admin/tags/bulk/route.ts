/**
 * API Route: POST /api/admin/tags/bulk - Bulk operations
 */
import { NextRequest, NextResponse } from "next/server"
import {
  bulkSoftDeleteTags,
  bulkRestoreTags,
  bulkHardDeleteTags,
  type AuthContext,
  ApplicationError,
} from "@/features/admin/tags/server/mutations"
import { BulkTagActionSchema } from "@/features/admin/tags/server/schemas"
import { createPostRoute } from "@/lib/api/api-route-wrapper"
import type { ApiRouteContext } from "@/lib/api/types"

async function bulkTagsHandler(req: NextRequest, context: ApiRouteContext) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại." }, { status: 400 })
  }

  // Validate với zod
  const validationResult = BulkTagActionSchema.safeParse(body)
  if (!validationResult.success) {
    const firstError = validationResult.error.issues[0]
    return NextResponse.json({ error: firstError?.message || "Dữ liệu không hợp lệ" }, { status: 400 })
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
      result = await bulkSoftDeleteTags(ctx, validatedBody.ids)
    } else if (validatedBody.action === "restore") {
      result = await bulkRestoreTags(ctx, validatedBody.ids)
    } else if (validatedBody.action === "hard-delete") {
      result = await bulkHardDeleteTags(ctx, validatedBody.ids)
    } else {
      return NextResponse.json({ error: "Action không hợp lệ" }, { status: 400 })
    }

    return NextResponse.json({ data: result })
  } catch (error) {
    if (error instanceof ApplicationError) {
      return NextResponse.json({ error: error.message || "Không thể thực hiện thao tác hàng loạt" }, { status: error.status || 400 })
    }
    console.error("Error in bulk tags operation:", error)
    return NextResponse.json({ error: "Đã xảy ra lỗi khi thực hiện thao tác hàng loạt" }, { status: 500 })
  }
}

export const POST = createPostRoute(bulkTagsHandler)

