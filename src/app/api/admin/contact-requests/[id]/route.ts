/**
 * API Route: GET /api/admin/contact-requests/[id] - Get contact request
 * PUT /api/admin/contact-requests/[id] - Update contact request
 * DELETE /api/admin/contact-requests/[id] - Soft delete contact request
 */
import { NextRequest, NextResponse } from "next/server"
import { getContactRequestById } from "@/features/admin/contact-requests/server/queries"
import { serializeContactRequestDetail } from "@/features/admin/contact-requests/server/helpers"
import {
  updateContactRequest,
  softDeleteContactRequest,
  type AuthContext,
  ApplicationError,
  NotFoundError,
} from "@/features/admin/contact-requests/server/mutations"
import { UpdateContactRequestSchema } from "@/features/admin/contact-requests/server/schemas"
import { createGetRoute, createPutRoute, createDeleteRoute } from "@/lib/api/api-route-wrapper"
import type { ApiRouteContext } from "@/lib/api/types"

async function getContactRequestHandler(_req: NextRequest, _context: ApiRouteContext, ...args: unknown[]) {
  const { params } = args[0] as { params: Promise<{ id: string }> }
  const { id: contactRequestId } = await params

  if (!contactRequestId) {
    return NextResponse.json({ error: "Contact Request ID is required" }, { status: 400 })
  }

  // Sử dụng getContactRequestById (non-cached) để đảm bảo data luôn fresh
  // Theo chuẩn Next.js 16: không cache admin data trong API routes
  const contactRequest = await getContactRequestById(contactRequestId)

  if (!contactRequest) {
    return NextResponse.json({ error: "Contact Request not found" }, { status: 404 })
  }

  return NextResponse.json({ data: serializeContactRequestDetail(contactRequest) })
}

async function putContactRequestHandler(req: NextRequest, context: ApiRouteContext, ...args: unknown[]) {
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
  const validationResult = UpdateContactRequestSchema.safeParse(body)
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
    const contactRequest = await updateContactRequest(ctx, contactRequestId, validationResult.data)
    // Serialize contact request to client format (dates to strings)
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
      return NextResponse.json({ error: error.message || "Không thể cập nhật yêu cầu liên hệ" }, { status: error.status || 400 })
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message || "Không tìm thấy" }, { status: 404 })
    }
    console.error("Error updating contact request:", error)
    return NextResponse.json({ error: "Đã xảy ra lỗi khi cập nhật yêu cầu liên hệ" }, { status: 500 })
  }
}

async function deleteContactRequestHandler(_req: NextRequest, context: ApiRouteContext, ...args: unknown[]) {
  const { params } = args[0] as { params: Promise<{ id: string }> }
  const { id: contactRequestId } = await params

  if (!contactRequestId) {
    return NextResponse.json({ error: "Contact Request ID is required" }, { status: 400 })
  }

  const ctx: AuthContext = {
    actorId: context.session.user?.id ?? "unknown",
    permissions: context.permissions,
    roles: context.roles,
  }

  try {
    await softDeleteContactRequest(ctx, contactRequestId)
    return NextResponse.json({ message: "Contact Request deleted successfully" })
  } catch (error) {
    if (error instanceof ApplicationError) {
      return NextResponse.json({ error: error.message || "Không thể xóa yêu cầu liên hệ" }, { status: error.status || 400 })
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message || "Không tìm thấy" }, { status: 404 })
    }
    console.error("Error deleting contact request:", error)
    return NextResponse.json({ error: "Đã xảy ra lỗi khi xóa yêu cầu liên hệ" }, { status: 500 })
  }
}

export const GET = createGetRoute(getContactRequestHandler)
export const PUT = createPutRoute(putContactRequestHandler)
export const DELETE = createDeleteRoute(deleteContactRequestHandler)

