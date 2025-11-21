/**
 * API Route: POST /api/admin/posts/bulk - Bulk operations
 */
import { NextRequest } from "next/server"
import { bulkPostsAction, type AuthContext, ApplicationError } from "@/features/admin/posts/server/mutations"
import { createPostRoute } from "@/lib/api/api-route-wrapper"
import type { ApiRouteContext } from "@/lib/api/types"
import { createErrorResponse, createSuccessResponse, logger } from "@/lib/config"
import { z } from "zod"

const BulkPostActionSchema = z.object({
  action: z.enum(["delete", "restore", "hard-delete"]),
  ids: z.array(z.string().cuid("ID không hợp lệ")).min(1, "Danh sách ID không được trống"),
})

async function bulkPostsHandler(req: NextRequest, context: ApiRouteContext) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return createErrorResponse("Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.", { status: 400 })
  }

  // Validate với zod
  const validationResult = BulkPostActionSchema.safeParse(body)
  if (!validationResult.success) {
    const firstError = validationResult.error.issues[0]
    return createErrorResponse(firstError?.message || "Dữ liệu không hợp lệ", { status: 400 })
  }

  const validatedBody = validationResult.data

  const ctx: AuthContext = {
    actorId: context.session.user?.id ?? "unknown",
    permissions: context.permissions,
    roles: context.roles,
  }

  try {
    const result = await bulkPostsAction(ctx, validatedBody.action, validatedBody.ids)
    return createSuccessResponse(result)
  } catch (error) {
    if (error instanceof ApplicationError) {
      return createErrorResponse(error.message || "Không thể thực hiện thao tác hàng loạt", { status: error.status || 400 })
    }
    logger.error("Error in bulk posts operation", error as Error)
    return createErrorResponse("Đã xảy ra lỗi khi thực hiện thao tác hàng loạt", { status: 500 })
  }
}

export const POST = createPostRoute(bulkPostsHandler)

