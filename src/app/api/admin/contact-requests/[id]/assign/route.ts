/**
 * API Route: POST /api/admin/contact-requests/[id]/assign - Assign contact request
 */
import { NextRequest, NextResponse } from "next/server"
import {
  assignContactRequest,
  type AuthContext,
  ApplicationError,
  NotFoundError,
} from "@/features/admin/contact-requests/server/mutations"
import { AssignContactRequestSchema } from "@/features/admin/contact-requests/server/schemas"
import { createPostRoute } from "@/lib/api/api-route-wrapper"
import type { ApiRouteContext } from "@/lib/api/types"

async function assignContactRequestHandler(req: NextRequest, context: ApiRouteContext, ...args: unknown[]) {
  const { params } = args[0] as { params: Promise<{ id: string }> }
  const { id: contactRequestId } = await params

  if (!contactRequestId) {
    return NextResponse.json({ error: "Contact Request ID is required" }, { status: 400 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại." }, { status: 400 })
  }

  // Validate body với Zod schema
  const validationResult = AssignContactRequestSchema.safeParse(body)
  if (!validationResult.success) {
    const firstError = validationResult.error.issues[0]
    return NextResponse.json({ error: firstError?.message || "Dữ liệu không hợp lệ" }, { status: 400 })
  }

  const ctx: AuthContext = {
    actorId: context.session.user?.id ?? "unknown",
    permissions: context.permissions,
    roles: context.roles,
  }

  try {
    const contactRequest = await assignContactRequest(ctx, contactRequestId, validationResult.data)
    // Serialize contact request to client format
    const serialized = {
      id: contactRequest.id,
      name: contactRequest.name,
      email: contactRequest.email,
      phone: contactRequest.phone,
      subject: contactRequest.subject,
      content: contactRequest.content,
      status: contactRequest.status,
      priority: contactRequest.priority,
      isRead: contactRequest.isRead,
      userId: contactRequest.userId,
      assignedToId: contactRequest.assignedToId,
      assignedTo: contactRequest.assignedTo,
      createdAt: contactRequest.createdAt.toISOString(),
      updatedAt: contactRequest.updatedAt.toISOString(),
      deletedAt: contactRequest.deletedAt ? contactRequest.deletedAt.toISOString() : null,
    }
    return NextResponse.json({ data: serialized })
  } catch (error) {
    if (error instanceof ApplicationError) {
      return NextResponse.json({ error: error.message || "Không thể giao yêu cầu liên hệ" }, { status: error.status || 400 })
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message || "Không tìm thấy" }, { status: 404 })
    }
    console.error("Error assigning contact request:", error)
    return NextResponse.json({ error: "Đã xảy ra lỗi khi giao yêu cầu liên hệ" }, { status: 500 })
  }
}

export const POST = createPostRoute(assignContactRequestHandler)

